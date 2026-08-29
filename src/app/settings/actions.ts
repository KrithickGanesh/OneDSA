'use server';

import { createClient } from '@/lib/supabase/server';
import { encryptApiKey, decryptApiKey } from '@/lib/crypto';
import { GoogleGenAI } from '@google/genai'; // Assuming using @google/genai

export async function saveGeminiKey(formData: FormData) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    const apiKey = formData.get('apiKey') as string;
    if (!apiKey) {
      return { success: false, error: 'API Key is required' };
    }

    const { encryptedKey, iv, authTag, keyHint } = await encryptApiKey(apiKey);

    const { error: dbError } = await supabase
      .from('user_api_keys')
      .upsert({
        user_id: user.id,
        service: 'gemini',
        encrypted_key: encryptedKey,
        iv,
        auth_tag: authTag,
        key_hint: keyHint,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,service' });

    if (dbError) throw dbError;

    return { success: true, keyHint };
  } catch (error: any) {
    console.error('Error saving Gemini key:', error);
    return { success: false, error: error.message || 'Failed to save API key' };
  }
}

export async function getGeminiKeyHint() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return { success: false, error: 'Unauthorized' };

    const { data, error } = await supabase
      .from('user_api_keys')
      .select('key_hint')
      .eq('user_id', user.id)
      .eq('service', 'gemini')
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 is no rows returned

    return { success: true, keyHint: data?.key_hint || null };
  } catch (error: any) {
    console.error('Error fetching key hint:', error);
    return { success: false, error: 'Failed to fetch key hint' };
  }
}

export async function savePlatformHandle(userId: string, platform: string, handle: string, cfKey?: string, cfSecret?: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user || user.id !== userId) return { success: false, error: 'Unauthorized' };

    const payload: any = {
      user_id: userId,
      platform,
      handle,
      updated_at: new Date().toISOString()
    };
    
    if (cfKey) payload.codeforces_api_key = cfKey;
    if (cfSecret) payload.codeforces_api_secret = cfSecret;

    const { error } = await supabase
      .from('user_platform_handles')
      .upsert(payload, { onConflict: 'user_id,platform' });

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('Error saving platform handle:', error);
    return { success: false, error: error.message || 'Failed to save handle' };
  }
}

export async function getPlatformHandles(userId: string) {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('user_platform_handles')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error: any) {
    console.error('Error fetching handles:', error);
    return { success: false, error: 'Failed to fetch handles', data: [] };
  }
}

export async function testGeminiKey() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return { success: false, error: 'Unauthorized' };

    const { data, error } = await supabase
      .from('user_api_keys')
      .select('encrypted_key, iv, auth_tag')
      .eq('user_id', user.id)
      .eq('service', 'gemini')
      .single();

    if (error) {
      if (error.code === 'PGRST116') return { success: false, error: 'No API key found' };
      throw error;
    }

    const apiKey = await decryptApiKey(data.encrypted_key, data.iv, data.auth_tag);

    // Test the API key
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: 'Say "hello world" in a short sentence.',
    });
    
    if (!response.text) throw new Error('Empty response from Gemini');

    return { success: true, message: 'API key is valid and working!' };
  } catch (error: any) {
    console.error('Error testing Gemini key:', error);
    return { success: false, error: 'Invalid API key or API error' };
  }
}
