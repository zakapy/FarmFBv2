import axios from '../api/axios';
import { API } from '../api/endpoints';

/**
 * Service for handling Facebook account registration
 */
const registrationService = {
  /**
   * Register a new Facebook account
   * @param {Object} data - Registration data
   * @param {number} data.profileId - Dolphin profile ID
   * @returns {Promise<Object>} Registration result
   */
  async registerFacebookAccount(data) {
    try {
      const response = await axios.post(API.REGISTRATION.FACEBOOK, data);
      return response.data;
    } catch (error) {
      if (error.response && error.response.data) {
        throw new Error(error.response.data.message || error.response.data.error || 'Registration failed');
      }
      throw new Error('Failed to connect to the server');
    }
  }
};

export default registrationService; 