const express = require('express');
const emailService = require('../services/emailService');
const router = express.Router();

// Send welcome email
router.post('/welcome', async (req, res) => {
  try {
    const { email, name } = req.body;
    
    if (!email || !name) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and name are required' 
      });
    }

    await emailService.sendWelcomeEmail(email, name);
    
    res.json({ 
      success: true, 
      message: 'Welcome email sent successfully' 
    });
  } catch (error) {
    console.error('Welcome email error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send welcome email' 
    });
  }
});

// Send order confirmation
router.post('/order-confirmation', async (req, res) => {
  try {
    const { email, orderDetails } = req.body;
    
    if (!email || !orderDetails) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and order details are required' 
      });
    }

    await emailService.sendOrderConfirmation(email, orderDetails);
    
    res.json({ 
      success: true, 
      message: 'Order confirmation sent successfully' 
    });
  } catch (error) {
    console.error('Order confirmation error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send order confirmation' 
    });
  }
});

// Send password reset
router.post('/password-reset', async (req, res) => {
  try {
    const { email, resetToken } = req.body;
    
    if (!email || !resetToken) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and reset token are required' 
      });
    }

    await emailService.sendPasswordReset(email, resetToken);
    
    res.json({ 
      success: true, 
      message: 'Password reset email sent successfully' 
    });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send password reset email' 
    });
  }
});

// Test email endpoint
router.post('/test', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email is required' 
      });
    }

    await emailService.sendWelcomeEmail(email, 'Test User');
    
    res.json({ 
      success: true, 
      message: 'Test email sent successfully' 
    });
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send test email' 
    });
  }
});

module.exports = router;
