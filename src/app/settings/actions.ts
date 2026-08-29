'use server';

import { createClient } from '@/lib/supabase/server';
import { encryptApiKey, decryptApiKey } from '@/lib/crypto';
import { GoogleGenAI } from '@google/genai';

export async function saveGeminiKey(formData: FormData) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return { success: false, error: 'You must be logged in to save API keys' };
    }

    const apiKey = (formData.get('apiKey') as string)?.trim();
    if (!apiKey) {
      return { success: false, error: 'API Key is required' };
    }

    const { encryptedKey, iv, authTag, keyHint } = await encryptApiKey(apiKey);

    const { error: dbError } = await supabase
      .from('user_api_keys')
      .upsert({
        user_id: user.id,
        provider: 'gemini',
        encrypted_key: encryptedKey,
        iv,
        auth_tag: authTag,
        key_hint: keyHint,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,provider' });

    if (dbError) throw dbError;

    return { success: true, keyHint };
  } catch (error: any) {
    console.error('Error saving Gemini key:', error);
    return { success: false, error: error.message || 'Failed to save API key' };
  }
}

export async function deleteGeminiKey() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    const { error } = await supabase
      .from('user_api_keys')
      .delete()
      .eq('user_id', user.id)
      .eq('provider', 'gemini');

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('Error deleting Gemini key:', error);
    return { success: false, error: error.message || 'Failed to remove API key' };
  }
}

export async function getGeminiKeyHint() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return { success: false, error: 'Unauthorized', keyHint: null };

    const { data, error } = await supabase
      .from('user_api_keys')
      .select('key_hint')
      .eq('user_id', user.id)
      .eq('provider', 'gemini')
      .maybeSingle();

    if (error) throw error;

    return { success: true, keyHint: data?.key_hint || null };
  } catch (error: any) {
    console.error('Error fetching key hint:', error);
    return { success: false, error: 'Failed to fetch key hint', keyHint: null };
  }
}

export async function savePlatformHandle(
  platformOrUserId: string,
  platformOrHandle?: string,
  handleOrCfKey?: string,
  cfKeyOrSecret?: string,
  cfSecretParam?: string
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return { success: false, error: 'You must be logged in to save platform handles' };
    }

    // Support both signatures:
    // 1. savePlatformHandle(platform, handle, cfKey, cfSecret)
    // 2. savePlatformHandle(userId, platform, handle, cfKey, cfSecret)
    let platform: string;
    let handle: string;
    let cfKey: string | undefined;
    let cfSecret: string | undefined;

    if (cfSecretParam !== undefined) {
      // 5-arg version: (userId, platform, handle, cfKey, cfSecret)
      platform = platformOrHandle || '';
      handle = handleOrCfKey || '';
      cfKey = cfKeyOrSecret;
      cfSecret = cfSecretParam;
    } else if (cfKeyOrSecret !== undefined) {
      // 4-arg version: could be (userId, platform, handle, cfKey) or (platform, handle, cfKey, cfSecret)
      // Check if first arg looks like a UUID (36 chars with dashes)
      if (platformOrUserId.length === 36 && platformOrUserId.includes('-')) {
        platform = platformOrHandle || '';
        handle = handleOrCfKey || '';
        cfKey = cfKeyOrSecret;
      } else {
        platform = platformOrUserId;
        handle = platformOrHandle || '';
        cfKey = handleOrCfKey;
        cfSecret = cfKeyOrSecret;
      }
    } else {
      // 2 or 3 args
      if (platformOrUserId.length === 36 && platformOrUserId.includes('-')) {
        platform = platformOrHandle || '';
        handle = handleOrCfKey || '';
      } else {
        platform = platformOrUserId;
        handle = platformOrHandle || '';
        cfKey = handleOrCfKey;
      }
    }

    const cleanPlatform = platform.trim().toLowerCase();
    const cleanHandle = handle.trim();

    if (!cleanPlatform) {
      return { success: false, error: 'Platform identifier is required' };
    }

    // If handle is empty, treat as disconnect / delete
    if (!cleanHandle) {
      const { error: delError } = await supabase
        .from('user_platform_handles')
        .delete()
        .eq('user_id', user.id)
        .eq('platform', cleanPlatform);

      if (delError) throw delError;

      return { success: true, action: 'deleted', platform: cleanPlatform };
    }

    const payload: {
      user_id: string;
      platform: string;
      handle: string;
      codeforces_api_key?: string | null;
      codeforces_api_secret?: string | null;
      updated_at: string;
    } = {
      user_id: user.id,
      platform: cleanPlatform,
      handle: cleanHandle,
      updated_at: new Date().toISOString()
    };
    
    if (cleanPlatform === 'codeforces') {
      payload.codeforces_api_key = cfKey?.trim() || null;
      payload.codeforces_api_secret = cfSecret?.trim() || null;
    }

    const { error } = await supabase
      .from('user_platform_handles')
      .upsert(payload, { onConflict: 'user_id,platform' });

    if (error) throw error;

    return { success: true, action: 'saved', platform: cleanPlatform, handle: cleanHandle };
  } catch (error: any) {
    console.error('Error saving platform handle:', error);
    return { success: false, error: error.message || 'Failed to save handle' };
  }
}

export async function deletePlatformHandle(platform: string) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    const cleanPlatform = platform.trim().toLowerCase();

    const { error } = await supabase
      .from('user_platform_handles')
      .delete()
      .eq('user_id', user.id)
      .eq('platform', cleanPlatform);

    if (error) throw error;

    return { success: true, platform: cleanPlatform };
  } catch (error: any) {
    console.error('Error deleting platform handle:', error);
    return { success: false, error: error.message || 'Failed to delete handle' };
  }
}

export async function getPlatformHandles(userId?: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    const targetUserId = user?.id || userId;
    if (!targetUserId) {
      return { success: false, error: 'Unauthorized', data: [] };
    }

    const { data, error } = await supabase
      .from('user_platform_handles')
      .select('*')
      .eq('user_id', targetUserId);

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error: any) {
    console.error('Error fetching handles:', error);
    return { success: false, error: error.message || 'Failed to fetch handles', data: [] };
  }
}

export async function testGeminiKey() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    const { data, error } = await supabase
      .from('user_api_keys')
      .select('encrypted_key, iv, auth_tag')
      .eq('user_id', user.id)
      .eq('provider', 'gemini')
      .maybeSingle();

    if (error) throw error;
    if (!data) return { success: false, error: 'No saved API key found' };

    const apiKey = await decryptApiKey(data.encrypted_key, data.iv, data.auth_tag);

    // Test the API key using @google/genai
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: 'Say "hello" in one word.',
    });
    
    if (!response.text) throw new Error('Empty response from Gemini');

    return { success: true, message: 'Gemini API key is valid and working!' };
  } catch (error: any) {
    console.error('Error testing Gemini key:', error);
    return { success: false, error: error.message || 'Invalid API key or API error' };
  }
}
