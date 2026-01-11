import { supabase } from './supabaseClient';

interface SendEmailParams {
    to: string | string[];
    subject: string;
    type: 'transactional' | 'notification' | 'marketing' | 'custom' | 'welcome';
    html?: string;
    data?: Record<string, any>;
}

export const sendEmail = async (params: SendEmailParams) => {
    const { data, error } = await supabase.functions.invoke('send-email', {
        body: params
    });

    if (error) throw error;
    return data;
};

export const sendWelcomeEmail = async (email: string, name: string) => {
    return sendEmail({
        to: email,
        subject: 'Welcome to Library KPI',
        type: 'welcome',
        data: {
            name,
            actionUrl: window.location.origin
        }
    });
};
