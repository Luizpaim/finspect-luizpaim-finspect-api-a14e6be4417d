import * as Sendgrid from '@sendgrid/mail';

export const sendConfirmationEmail = (email: string, username: string, link: string) => {
    Sendgrid.setApiKey(process.env.SENDGRID_API_KEY);

    // https://github.com/sendgrid/sendgrid-nodejs/blob/master/packages/mail/USE_CASES.md
    return Sendgrid.send({
        templateId: 'b644e37f-03da-44fb-b222-4b02a897200c',
        substitutionWrappers: ['{{', '}}'],
        from: 'contato@finspect.com.br',
        to: email,
        substitutions: {
            name: username,
            confirmationLink: link
        }
    });
};

export const sendUnpaidEmail = (accountant: any) => {
    Sendgrid.setApiKey(process.env.SENDGRID_API_KEY);

    // https://github.com/sendgrid/sendgrid-nodejs/blob/master/packages/mail/USE_CASES.md
    return Sendgrid.send({
        templateId: 'b644e37f-03da-44fb-b222-4b02a897200c',
        substitutionWrappers: ['{{', '}}'],
        from: 'contato@finspect.com.br',
        to: 'admin@finspect.com.br',
        substitutions: {
            name: accountant.name,
        }
    });
};