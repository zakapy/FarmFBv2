const facebookRegistrationService = require('../services/facebookRegistrationService');
const logger = require('../config/logger');
const accountService = require('../services/accountService');

/**
 * Controller for Facebook account registration
 */

/**
 * Registers a new Facebook account using the specified Dolphin profile
 * @param {Object} req - HTTP request object
 * @param {Object} res - HTTP response object
 */
exports.registerFacebookAccount = async (req, res) => {
  try {
    const { profileId } = req.body;
    
    if (!profileId) {
      return res.status(400).json({
        success: false,
        error: 'Dolphin profile ID is required'
      });
    }
    
    logger.info(`Starting Facebook account registration with profile ID: ${profileId}`);
    
    // Start the registration process
    const result = await facebookRegistrationService.startRegistration(profileId);
    
    if (!result.success) {
      logger.error(`Facebook registration failed: ${result.error}`);
      return res.status(400).json({
        success: false,
        error: result.error,
        message: result.message || 'Failed to register Facebook account'
      });
    }
    
    // If registration is successful, create an account in the database
    if (result.account) {
      try {
        const accountData = {
          name: `${result.account.firstName} ${result.account.lastName}`,
          cookies: result.account.cookies,
          status: result.account.status === 'active' ? 'активен' : 'неактивен',
          meta: {
            email: result.account.email,
            password: result.account.password,
            registrationDate: new Date()
          },
          dolphin: {
            profileId: profileId,
            syncedAt: new Date()
          }
        };
        
        const newAccount = await accountService.create(req.user.id, accountData);
        
        // Return success response with account details
        return res.status(201).json({
          success: true,
          message: 'Facebook account successfully registered',
          account: {
            id: newAccount._id,
            name: newAccount.name,
            email: result.account.email,
            password: result.account.password,
            status: newAccount.status
          }
        });
      } catch (accountError) {
        logger.error(`Error creating account in database: ${accountError.message}`);
        
        // Return success but with warning about database error
        return res.status(200).json({
          success: true,
          message: 'Facebook account registered but failed to save in database',
          warning: 'Account data could not be saved in the database',
          account: {
            email: result.account.email,
            password: result.account.password,
            status: result.account.status
          }
        });
      }
    }
    
    return res.status(200).json(result);
  } catch (error) {
    logger.error(`Unexpected error in registration controller: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Registration failed due to an unexpected error',
      message: error.message
    });
  }
}; 