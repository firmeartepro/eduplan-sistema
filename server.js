const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const mercadopago = require('mercadopago');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configurações
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

// Configurar Mercado Pago
mercadopago.configure({
    access_token: process.env.MP_ACCESS_TOKEN
});

// Rotas

// Processar pagamento
app.post('/api/process-payment', async (req, res) => {
    try {
        const { userData, paymentData } = req.body;

        // Criar preferência de pagamento no Mercado Pago
        const preference = {
            items: [{
                title: paymentData.description,
                unit_price: paymentData.transaction_amount,
                quantity: 1,
                currency_id: 'BRL'
            }],
            payer: {
                email: paymentData.payer.email,
                identification: paymentData.payer.identification
            },
            payment_methods: {
                excluded_payment_methods: [],
                excluded_payment_types: [],
                installments: 12
            },
            back_urls: {
                success: `${process.env.FRONTEND_URL}/payment-success`,
                failure: `${process.env.FRONTEND_URL}/payment-failure`,
                pending: `${process.env.FRONTEND_URL}/payment-pending`
            },
            auto_return: 'approved',
            external_reference: `user_${Date.now()}`,
            notification_url: `${process.env.BACKEND_URL}/api/webhooks/mercadopago`
        };

        const response = await mercadopago.preferences.create(preference);

        // Processar pagamento direto (cartão)
        const payment = {
            transaction_amount: paymentData.transaction_amount,
            token: paymentData.token,
            description: paymentData.description,
            installments: paymentData.installments,
            payment_method_id: paymentData.payment_method_id,
            issuer_id: paymentData.issuer_id,
            payer: {
                email: paymentData.payer.email,
                identification: paymentData.payer.identification
            }
        };

        const paymentResponse = await mercadopago.payment.save(payment);

        if (paymentResponse.body.status === 'approved') {
            // Criar conta do usuário
            await createUserAccount(userData, paymentResponse.body.id);
            
            res.json({
                success: true,
                paymentId: paymentResponse.body.id,
                status: paymentResponse.body.status
            });
        } else {
            res.json({
                success: false,
                message: 'Pagamento não aprovado',
                status: paymentResponse.body.status
            });
        }

    } catch (error) {
        console.error('Erro no pagamento:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// Webhook do Mercado Pago
app.post('/api/webhooks/mercadopago', async (req, res) => {
    try {
        const { type, data } = req.body;

        if (type === 'payment') {
            const paymentId = data.id;
            
            // Buscar informações do pagamento
            const payment = await mercadopago.payment.findById(paymentId);
            
            // Atualizar status no banco
            await updatePaymentStatus(paymentId, payment.body.status);
            
            // Se for uma renovação de assinatura
            if (payment.body.external_reference?.includes('subscription_')) {
                await handleSubscriptionRenewal(payment.body);
            }
        }

        res.status(200).send('OK');
    } catch (error) {
        console.error('Erro no webhook:', error);
        res.status(500).send('Error');
    }
});

// Criar assinatura
app.post('/api/create-subscription', async (req, res) => {
    try {
        const { userId, planType, paymentMethodId } = req.body;

        const amount = planType === 'individual' ? 19.90 : 199.00;
        
        // Criar assinatura no Mercado Pago
        const subscription = {
            reason: `EduPlan - ${planType === 'individual' ? 'Plano Individual' : 'Plano Escola'}`,
            auto_recurring: {
                frequency: 1,
                frequency_type: 'months',
                transaction_amount: amount,
                currency_id: 'BRL'
            },
            payer_email: req.body.email,
            card_token_id: paymentMethodId,
            external_reference: `subscription_${userId}`,
            notification_url: `${process.env.BACKEND_URL}/api/webhooks/mercadopago`
        };

        const response = await mercadopago.preapproval.create(subscription);

        // Salvar assinatura no banco
        await saveSubscription(userId, response.body.id, planType);

        res.json({
            success: true,
            subscriptionId: response.body.id,
            status: response.body.status
        });

    } catch (error) {
        console.error('Erro ao criar assinatura:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao criar assinatura'
        });
    }
});

// Cancelar assinatura
app.post('/api/cancel-subscription', async (req, res) => {
    try {
        const { subscriptionId } = req.body;

        await mercadopago.preapproval.update({
            id: subscriptionId,
            status: 'cancelled'
        });

        // Atualizar no banco
        await cancelSubscription(subscriptionId);

        res.json({ success: true });

    } catch (error) {
        console.error('Erro ao cancelar assinatura:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao cancelar assinatura'
        });
    }
});

// Obter status do plano
app.get('/api/plan-status/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        const { data: user } = await supabase
            .from('users')
            .select('*, schools(*)')
            .eq('id', userId)
            .single();

        if (!user) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        const now = new Date();
        const nextBilling = new Date(user.schools.next_billing_date);
        const daysUntilExpiry = Math.ceil((nextBilling - now) / (1000 * 60 * 60 * 24));

        res.json({
            planType: user.schools.plan_type,
            planStatus: user.schools.plan_status,
            nextBillingDate: user.schools.next_billing_date,
            daysUntilExpiry,
            isExpired: user.schools.plan_status === 'expired' || daysUntilExpiry < 0
        });

    } catch (error) {
        console.error('Erro ao obter status do plano:', error);
        res.status(500).json({ error: 'Erro interno' });
    }
});

// Funções auxiliares

async function createUserAccount(userData, paymentId) {
    try {
        // Criar escola
        const { data: school, error: schoolError } = await supabase
            .from('schools')
            .insert([{
                name: userData.schoolName,
                plan_type: userData.planType,
                plan_status: 'active',
                payment_id: paymentId,
                next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            }])
            .select()
            .single();

        if (schoolError) throw schoolError;

        // Criar usuário no Supabase Auth
        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
            email: userData.email,
            password: userData.password,
            email_confirm: true
        });

        if (authError) throw authError;

        // Criar perfil do usuário
        const { error: userError } = await supabase
            .from('users')
            .insert([{
                id: authUser.user.id,
                email: userData.email,
                name: userData.name,
                user_type: userData.userType,
                school_id: school.id,
                is_active: true
            }]);

        if (userError) throw userError;

        return { success: true };

    } catch (error) {
        console.error('Erro ao criar conta:', error);
        throw error;
    }
}

async function updatePaymentStatus(paymentId, status) {
    try {
        const { error } = await supabase
            .from('schools')
            .update({
                plan_status: status === 'approved' ? 'active' : 'pending',
                last_payment_date: new Date().toISOString()
            })
            .eq('payment_id', paymentId);

        if (error) throw error;

    } catch (error) {
        console.error('Erro ao atualizar status:', error);
    }
}

async function handleSubscriptionRenewal(payment) {
    try {
        const subscriptionId = payment.external_reference.replace('subscription_', '');
        
        // Atualizar próxima data de cobrança
        const nextBilling = new Date();
        nextBilling.setMonth(nextBilling.getMonth() + 1);

        const { error } = await supabase
            .from('schools')
            .update({
                plan_status: payment.status === 'approved' ? 'active' : 'expired',
                next_billing_date: nextBilling.toISOString(),
                last_payment_date: new Date().toISOString()
            })
            .eq('subscription_id', subscriptionId);

        if (error) throw error;

    } catch (error) {
        console.error('Erro na renovação:', error);
    }
}

async function saveSubscription(userId, subscriptionId, planType) {
    try {
        const { error } = await supabase
            .from('schools')
            .update({
                subscription_id: subscriptionId,
                plan_type: planType,
                plan_status: 'active'
            })
            .eq('id', userId);

        if (error) throw error;

    } catch (error) {
        console.error('Erro ao salvar assinatura:', error);
    }
}

async function cancelSubscription(subscriptionId) {
    try {
        const { error } = await supabase
            .from('schools')
            .update({
                plan_status: 'cancelled'
            })
            .eq('subscription_id', subscriptionId);

        if (error) throw error;

    } catch (error) {
        console.error('Erro ao cancelar no banco:', error);
    }
}

// Middleware para verificar plano ativo
app.use('/api/protected', async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: 'Token não fornecido' });
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            return res.status(401).json({ error: 'Token inválido' });
        }

        const { data: userProfile } = await supabase
            .from('users')
            .select('*, schools(*)')
            .eq('id', user.id)
            .single();

        if (!userProfile || userProfile.schools.plan_status !== 'active') {
            return res.status(403).json({ error: 'Plano inativo ou expirado' });
        }

        req.user = userProfile;
        next();

    } catch (error) {
        console.error('Erro na verificação:', error);
        res.status(500).json({ error: 'Erro interno' });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
})
