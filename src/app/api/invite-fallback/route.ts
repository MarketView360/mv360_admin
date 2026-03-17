import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

// Create Supabase Admin client with service_role key
function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase URL or service role key');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

// Create email transporter
function createTransporter() {
  // Check if we have SMTP credentials
  const hasSmtpConfig = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;

  if (!hasSmtpConfig) {
    throw new Error('SMTP configuration not found. Please set SMTP_HOST, SMTP_USER, and SMTP_PASS environment variables.');
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const { email, fullName } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Create Supabase Admin client
    const supabaseAdmin = createAdminClient();

    // Create user in auth.users (without sending email via Supabase)
    // This creates a pending user that needs to set their password
    const tempPassword = Math.random().toString(36).slice(-12) + 'A1!'; // Temporary strong password
    
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: false, // User must confirm via our email
      user_metadata: {
        full_name: fullName || '',
      }
    });

    if (authError) {
      console.error('Failed to create user in auth:', authError);
      return NextResponse.json(
        { error: `Failed to create user: ${authError.message}` },
        { status: 500 }
      );
    }

    // Generate signup link with temporary password
    const { data: resetData, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'signup',
      email,
      password: tempPassword,
      options: {
        data: {
          full_name: fullName || '',
        },
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback`,
      }
    });

    if (resetError || !resetData.properties?.action_link) {
      console.error('Failed to generate signup link:', resetError);
      return NextResponse.json(
        { error: 'Failed to generate invitation link' },
        { status: 500 }
      );
    }

    const inviteLink = resetData.properties.action_link;

    // Send email via nodemailer
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject: 'You\'ve been invited to MarketView360',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              background-color: #f4f4f4;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 20px auto;
              background: #ffffff;
              border-radius: 8px;
              overflow: hidden;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px 20px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
            }
            .content {
              padding: 30px 20px;
            }
            .content h2 {
              color: #333;
              margin-top: 0;
            }
            .button {
              display: inline-block;
              background: #667eea;
              color: white;
              text-decoration: none;
              padding: 12px 30px;
              border-radius: 5px;
              margin: 20px 0;
              font-weight: 600;
            }
            .button:hover {
              background: #5568d3;
            }
            .footer {
              background: #f8f9fa;
              padding: 20px;
              text-align: center;
              font-size: 12px;
              color: #666;
              border-top: 1px solid #e9ecef;
            }
            .note {
              background: #f8f9fa;
              padding: 15px;
              border-radius: 5px;
              margin: 15px 0;
              font-size: 14px;
              border-left: 4px solid #667eea;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to MarketView360</h1>
            </div>
            <div class="content">
              <h2>Hello${fullName ? ` ${fullName}` : ''}!</h2>
              <p>You've been invited to join MarketView360 - the comprehensive financial analysis platform.</p>
              <p>Click the button below to activate your account and set your password:</p>
              <div style="text-align: center;">
                <a href="${inviteLink}" class="button">Activate Account</a>
              </div>
              <div class="note">
                <strong>Note:</strong> This invitation link is valid for 24 hours. If you didn't request this invitation, you can safely ignore this email.
              </div>
              <p>If the button doesn't work, copy and paste this link into your browser:</p>
              <p style="word-break: break-all; font-size: 12px; color: #666;">${inviteLink}</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} MarketView360. All rights reserved.</p>
              <p>This is an automated email. Please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Hello${fullName ? ` ${fullName}` : ''}!

You've been invited to join MarketView360 - the comprehensive financial analysis platform.

Click the link below to activate your account and set your password:
${inviteLink}

Note: This invitation link is valid for 24 hours. If you didn't request this invitation, you can safely ignore this email.

© ${new Date().getFullYear()} MarketView360. All rights reserved.
This is an automated email. Please do not reply.
      `.trim(),
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json({
      success: true,
      userId: authData.user.id,
      message: 'Invitation sent successfully via fallback email service'
    });

  } catch (error) {
    console.error('Fallback email service error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send invitation email' },
      { status: 500 }
    );
  }
}
