import React, { useState } from 'react';
import { Button, Modal, message, Spin, Result, Typography } from 'antd';
import registrationService from '../../services/registrationService';

const { Title, Paragraph, Text } = Typography;

/**
 * Button to initiate Facebook account registration
 * @param {Object} props
 * @param {number} props.profileId - Dolphin profile ID
 * @param {Function} props.onSuccess - Callback after successful registration
 */
const FacebookRegistrationButton = ({ profileId, onSuccess }) => {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  
  const startRegistration = async () => {
    if (!profileId) {
      message.error('Profile ID is required');
      return;
    }
    
    setLoading(true);
    setResult(null);
    
    try {
      const response = await registrationService.registerFacebookAccount({ profileId });
      
      setResult({
        success: response.success,
        message: response.message,
        account: response.account
      });
      
      if (response.success && onSuccess) {
        onSuccess(response.account);
      }
    } catch (error) {
      setResult({
        success: false,
        message: error.message
      });
    } finally {
      setLoading(false);
    }
  };
  
  const showModal = () => {
    setVisible(true);
    setResult(null);
  };
  
  const handleCancel = () => {
    if (!loading) {
      setVisible(false);
    }
  };
  
  const renderResult = () => {
    if (!result) return null;
    
    return (
      <Result
        status={result.success ? 'success' : 'error'}
        title={result.success ? 'Account Created Successfully' : 'Registration Failed'}
        subTitle={result.message}
        extra={
          result.success && result.account ? (
            <div>
              <Paragraph>
                <Text strong>Account details:</Text>
              </Paragraph>
              <Paragraph>
                <Text>Email: </Text>
                <Text copyable>{result.account.email}</Text>
              </Paragraph>
              <Paragraph>
                <Text>Password: </Text>
                <Text copyable>{result.account.password}</Text>
              </Paragraph>
              <Paragraph>
                <Text>Status: </Text>
                <Text>{result.account.status}</Text>
              </Paragraph>
            </div>
          ) : null
        }
      />
    );
  };
  
  return (
    <>
      <Button 
        type="primary" 
        onClick={showModal}
      >
        Register FB Account
      </Button>
      
      <Modal
        title="Facebook Account Registration"
        open={visible}
        onCancel={handleCancel}
        footer={[
          <Button key="cancel" onClick={handleCancel} disabled={loading}>
            Cancel
          </Button>,
          <Button 
            key="start" 
            type="primary" 
            onClick={startRegistration} 
            loading={loading}
            disabled={loading || (result && result.success)}
          >
            {!result ? 'Start Registration' : 'Try Again'}
          </Button>
        ]}
        width={600}
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: '30px' }}>
            <Spin size="large" />
            <Paragraph style={{ marginTop: '20px' }}>
              Please wait while we register your Facebook account. This process may take several minutes.
            </Paragraph>
            <Paragraph type="secondary">
              Do not close this window during the registration process.
            </Paragraph>
          </div>
        ) : (
          result ? (
            renderResult()
          ) : (
            <div>
              <Paragraph>
                This will start the automatic registration of a Facebook account using your Dolphin profile.
              </Paragraph>
              <Paragraph>
                The process includes:
              </Paragraph>
              <ul>
                <li>Opening Facebook registration page</li>
                <li>Generating random user data</li>
                <li>Getting a temporary email for verification</li>
                <li>Completing the registration process</li>
              </ul>
              <Paragraph type="warning">
                The process may take several minutes. Please do not close this window.
              </Paragraph>
            </div>
          )
        )}
      </Modal>
    </>
  );
};

export default FacebookRegistrationButton; 