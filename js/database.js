console.log('=== DEBUG DATABASE.JS ===');
console.log('Firebase disponível:', typeof firebase);
console.log('Auth disponível:', typeof auth);
console.log('DB disponível:', typeof db);

async function saveLessonPlan(planData) {
    console.log('=== DEBUG SAVE LESSON PLAN ===');
    console.log('Dados recebidos:', planData);
    
    try {
        if (typeof firebase === 'undefined') {
            throw new Error('Firebase não está carregado');
        }
        
        if (typeof auth === 'undefined') {
            throw new Error('Auth não está inicializado');
        }
        
        if (typeof db === 'undefined') {
            throw new Error('Firestore não está inicializado');
        }
        
        const user = auth.currentUser;
        console.log('Usuário atual:', user);
        
        if (!user) {
            throw new Error('Usuário não autenticado');
        }
        
        if (!planData.subject || !planData.class || !planData.date) {
            throw new Error('Disciplina, turma e data são obrigatórios');
        }
        
        console.log('Tentando salvar no Firestore...');
        
        const docData = {
            ...planData,
            userId: user.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            week: getWeekString(new Date(planData.date)),
            year: new Date(planData.date).getFullYear()
        };
        
        console.log('Dados para salvar:', docData);
        
        const docRef = await db.collection('lessonPlans').add(docData);
        
        console.log('Planejamento salvo com sucesso! ID:', docRef.id);
        return docRef.id;
        
    } catch (error) {
        console.error('=== ERRO DETALHADO ===');
        console.error('Tipo do erro:', error.constructor.name);
        console.error('Mensagem:', error.message);
        console.error('Stack:', error.stack);
        console.error('Código do erro:', error.code);
        throw error;
    }
}

async function getUserLessonPlans() {
    console.log('=== DEBUG GET USER LESSON PLANS ===');
    
    try {
        const user = auth.currentUser;
        if (!user) throw new Error('Usuário não autenticado');
        
        console.log('Buscando planejamentos para usuário:', user.uid);
        
        const snapshot = await db.collection('lessonPlans')
            .where('userId', '==', user.uid)
            .orderBy('createdAt', 'desc')
            .get();
        
        const plans = [];
        snapshot.forEach(doc => {
            plans.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        console.log('Planejamentos encontrados:', plans.length);
        return plans;
        
    } catch (error) {
        console.error('Erro ao buscar planejamentos:', error);
        throw error;
    }
}

async function getUserData() {
    try {
        const user = auth.currentUser;
        if (!user) throw new Error('Usuário não autenticado');
        
        const doc = await db.collection('users').doc(user.uid).get();
        
        if (doc.exists) {
            return doc.data();
        } else {
            const userData = {
                name: user.displayName || 'Professor',
                email: user.email,
                subscription: {
                    plan: 'trial',
                    status: 'active'
                }
            };
            
            await db.collection('users').doc(user.uid).set(userData);
            return userData;
        }
        
    } catch (error) {
        console.error('Erro ao buscar dados do usuário:', error);
        throw error;
    }
}

async function saveActivity(activityData) {
    try {
        const user = auth.currentUser;
        if (!user) throw new Error('Usuário não autenticado');
        
        if (!activityData.title || !activityData.subject || !activityData.grade) {
            throw new Error('Título, disciplina e série são obrigatórios');
        }
        
        const docRef = await db.collection('activities').add({
            ...activityData,
            userId: user.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            isPublic: false,
            tags: generateTags(activityData)
        });
        
        console.log('Atividade salva com ID:', docRef.id);
        return docRef.id;
        
    } catch (error) {
        console.error('Erro ao salvar atividade:', error);
        throw error;
    }
}

async function getUserActivities() {
    try {
        const user = auth.currentUser;
        if (!user) throw new Error('Usuário não autenticado');
        
        const snapshot = await db.collection('activities')
            .where('userId', '==', user.uid)
            .orderBy('createdAt', 'desc')
            .get();
        
        const activities = [];
        snapshot.forEach(doc => {
            activities.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        return activities;
        
    } catch (error) {
        console.error('Erro ao buscar atividades:', error);
        throw error;
    }
}

function getWeekString(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNum = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return d.getUTCFullYear() + '-W' + weekNum.toString().padStart(2, '0');
}

function generateTags(activityData) {
    const tags = [];
    
    if (activityData.subject) tags.push(activityData.subject);
    if (activityData.grade) tags.push(activityData.grade + 'ano');
    if (activityData.type) tags.push(activityData.type);
    
    return tags;
}

console.log('=== FUNÇÕES CARREGADAS ===');
console.log('saveLessonPlan:', typeof saveLessonPlan);
console.log('getUserLessonPlans:', typeof getUserLessonPlans);
console.log('saveActivity:', typeof saveActivity);
console.log('getUserActivities:', typeof getUserActivities);
console.log('getUserData:', typeof getUserData);

console.log('Funções do banco de dados carregadas com debug!');
