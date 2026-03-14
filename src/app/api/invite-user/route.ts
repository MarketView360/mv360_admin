import { NextRequest, NextResponse } from 'next/server';
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

export async function POST(request: NextRequest) {
  try {
    const { email, full_name, subscription_tier = 'free', role = 'user' } = await request.json();

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    // Create admin client
    const supabaseAdmin = createAdminClient();

    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin
      .from('user_profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Redirect to main app (www.marketview360.io) for user signup
    const redirectUrl = 'https://www.marketview360.io/auth/callback';

    // Invite user via Supabase Admin API
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: {
        full_name: full_name || '',
        subscription_tier,
        role,
      },
      redirectTo: redirectUrl,
    });

    if (error) {
      console.error('Supabase invite error:', error);
      
      // Try fallback email service
      try {
        const fallbackResponse = await fetch(`${request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL}/api/invite-fallback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, fullName: full_name })
        });

        if (!fallbackResponse.ok) {
          const fallbackError = await fallbackResponse.text();
          return NextResponse.json(
            { 
              success: false, 
              error: `Supabase invite failed: ${error.message}. Fallback also failed: ${fallbackError}` 
            },
            { status: 500 }
          );
        }

        const fallbackResult = await fallbackResponse.json();
        return NextResponse.json({
          success: true,
          method: 'fallback',
          user: {
            id: fallbackResult.userId || '',
            email,
            invited_at: new Date().toISOString()
          }
        });
      } catch (fallbackErr) {
        return NextResponse.json(
          { 
            success: false, 
            error: `Supabase invite failed: ${error.message}. Fallback error: ${fallbackErr instanceof Error ? fallbackErr.message : 'Unknown error'}` 
          },
          { status: 500 }
        );
      }
    }

    // Create user profile
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        id: data.user.id,
        email,
        full_name: full_name || '',
        subscription_tier,
        role,
      });

    if (profileError) {
      console.error('Error creating user profile:', profileError);
      // User is invited but profile creation failed - log but don't fail
    }

    return NextResponse.json({
      success: true,
      method: 'supabase',
      user: {
        id: data.user.id,
        email: data.user.email || email,
        invited_at: data.user.created_at
      }
    });

  } catch (error) {
    console.error('Invite user error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}
