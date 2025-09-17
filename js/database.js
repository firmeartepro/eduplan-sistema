/ Funções do Banco de Dados

// Salvar planejamento de aula
async function saveLessonPlan(planData) {
    try {
        const user = auth.currentUser;
        if (!user) throw new Error('Usuário não autenticado');
        
        // Validar dados obrigatórios
        if (!planData.subject || !planData.class || !planData.date) {
            throw new Error('Disciplina, turma e data são obrigatórios');
        }
        
        const docRef = await db.collection('lessonPlans').add({
            ...planData,
            userId: user.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            week: getWeekString(new Date(planData.date)),
            year: new Date(planData.date).getFullYear()
        });
        
        console.log('Planejamento salvo com ID:', docRef.id);
        return docRef.id;
        
    } catch (error) {
        console.error('Erro ao salvar planejamento:', error);
        throw error;
    }
}

// Buscar planejamentos do usuário
async function getUserLessonPlans() {
    try {
        const user = auth.currentUser;
        if (!user) throw new Error('Usuário não autenticado');
        
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
        
        return plans;
        
    } catch (error) {
        console.error('Erro ao buscar planejamentos:', error);
        throw error;
    }
}

// Buscar planejamento por ID
async function getLessonPlanById(planId) {
    try {
        const user = auth.currentUser;
        if (!user) throw new Error('Usuário não autenticado');
        
        const doc = await db.collection('lessonPlans').doc(planId).get();
        
        if (doc.exists && doc.data().userId === user.uid) {
            return {
                id: doc.id,
                ...doc.data()
            };
        } else {
            throw new Error('Planejamento não encontrado');
        }
        
    } catch (error) {
        console.error('Erro ao buscar planejamento:', error);
        throw error;
    }
}

// Atualizar planejamento
async function updateLessonPlan(planId, planData) {
    try {
        const user = auth.currentUser;
        if (!user) throw new Error('Usuário não autenticado');
        
        await db.collection('lessonPlans').doc(planId).update({
            ...planData,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        console.log('Planejamento atualizado:', planId);
        return planId;
        
    } catch (error) {
        console.error('Erro ao atualizar planejamento:', error);
        throw error;
    }
}

// Deletar planejamento
async function deleteLessonPlan(planId) {
    try {
        const user = auth.currentUser;
        if (!user) throw new Error('Usuário não autenticado');
        
        // Verificar se o planejamento pertence ao usuário
        const doc = await db.collection('lessonPlans').doc(planId).get();
        
        if (!doc.exists || doc.data().userId !== user.uid) {
            throw new Error('Planejamento não encontrado ou sem permissão');
        }
        
        await db.collection('lessonPlans').doc(planId).delete();
        console.log('Planejamento deletado:', planId);
        
    } catch (error) {
        console.error('Erro ao deletar planejamento:', error);
        throw error;
    }
}

// Salvar atividade
async function saveActivity(activityData) {
    try {
        const user = auth.currentUser;
        if (!user) throw new Error('Usuário não autenticado');
        
        // Validar dados obrigatórios
        if (!activityData.title || !activityData.subject || !activityData.grade) {
            throw new Error('Título, disciplina e série são obrigatórios');
        }
        
        const docRef = await db.collection('activities').add({
            ...activityData,
            userId: user.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            isPublic: false, // Por padrão, atividades são privadas
            tags: generateTags(activityData) // Gerar tags automaticamente
        });
        
        console.log('Atividade salva com ID:', docRef.id);
        return docRef.id;
        
    } catch (error) {
        console.error('Erro ao salvar atividade:', error);
        throw error;
    }
}

// Buscar atividades do usuário
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

// Buscar atividades públicas (do sistema)
async function getPublicActivities(filters = {}) {
    try {
        let query = db.collection('activities').where('isPublic', '==', true);
        
        // Aplicar filtros
        if (filters.subject) {
            query = query.where('subject', '==', filters.subject);
        }
        
        if (filters.grade) {
            query = query.where('grade', '==', filters.grade);
        }
        
        const snapshot = await query.orderBy('createdAt', 'desc').limit(50).get();
        
        const activities = [];
        snapshot.forEach(doc => {
            activities.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        return activities;
        
    } catch (error) {
        console.error('Erro ao buscar atividades públicas:', error);
        throw error;
    }
}

// Buscar dados do usuário
async function getUserData() {
    try {
        const user = auth.currentUser;
        if (!user) throw new Error('Usuário não autenticado');
        
        const doc = await db.collection('users').doc(user.uid).get();
        
        if (doc.exists) {
            return doc.data();
        } else {
            throw new Error('Dados do usuário não encontrados');
        }
        
    } catch (error) {
        console.error('Erro ao buscar dados do usuário:', error);
        throw error;
    }
}

// Atualizar dados do usuário
async function updateUserData(userData) {
    try {
        const user = auth.currentUser;
        if (!user) throw new Error('Usuário não autenticado');
        
        await db.collection('users').doc(user.uid).update({
            ...userData,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        console.log('Dados do usuário atualizados');
        
    } catch (error) {
        console.error('Erro ao atualizar dados do usuário:', error);
        throw error;
    }
}

// Buscar planejamentos por semana
async function getLessonPlansByWeek(weekString) {
    try {
        const user = auth.currentUser;
        if (!user) throw new Error('Usuário não autenticado');
        
        const snapshot = await db.collection('lessonPlans')
            .where('userId', '==', user.uid)
            .where('week', '==', weekString)
            .orderBy('date', 'asc')
            .get();
        
        const plans = [];
        snapshot.forEach(doc => {
            plans.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        return plans;
        
    } catch (error) {
        console.error('Erro ao buscar planejamentos da semana:', error);
        throw error;
    }
}

// Buscar estatísticas do usuário
async function getUserStats() {
    try {
        const user = auth.currentUser;
        if (!user) throw new Error('Usuário não autenticado');
        
        // Buscar planejamentos
        const plansSnapshot = await db.collection('lessonPlans')
            .where('userId', '==', user.uid)
            .get();
        
        // Buscar atividades
        const activitiesSnapshot = await db.collection('activities')
            .where('userId', '==', user.uid)
            .get();
        
        // Calcular estatísticas
        const totalPlans = plansSnapshot.size;
        const totalActivities = activitiesSnapshot.size;
        
        // Contar por disciplina
        const subjectCounts = {};
        plansSnapshot.forEach(doc => {
            const subject = doc.data().subject;
            subjectCounts[subject] = (subjectCounts[subject] || 0) + 1;
        });
        
        // Planejamentos desta semana
        const thisWeek = getWeekString(new Date());
        const thisWeekPlans = plansSnapshot.docs.filter(doc => 
            doc.data().week === thisWeek
        ).length;
        
        return {
            totalPlans,
            totalActivities,
            thisWeekPlans,
            subjectCounts
        };
        
    } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
        throw error;
    }
}

// Funções utilitárias

// Gerar string da semana (formato: 2024-W10)
function getWeekString(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNum = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${weekNum.toString().padStart(2, '0')}`;
}

// Gerar tags automaticamente para atividades
function generateTags(activityData) {
    const tags = [];
    
    // Adicionar disciplina e série
    if (activityData.subject) tags.push(activityData.subject);
    if (activityData.grade) tags.push(`${activityData.grade}ano`);
    if (activityData.type) tags.push(activityData.type);
    
    // Extrair palavras-chave do título e descrição
    const text = `${activityData.title} ${activityData.description}`.toLowerCase();
    const keywords = text.match(/\b\w{4,}\b/g) || [];
    
    // Adicionar palavras-chave únicas
    keywords.forEach(keyword => {
        if (!tags.includes(keyword) && tags.length < 10) {
            tags.push(keyword);
        }
    });
    
    return tags;
}

// Buscar atividades com filtros
async function searchActivities(searchTerm, filters = {}) {
    try {
        const user = auth.currentUser;
        if (!user) throw new Error('Usuário não autenticado');
        
        let query = db.collection('activities').where('userId', '==', user.uid);
        
        // Aplicar filtros
        if (filters.subject) {
            query = query.where('subject', '==', filters.subject);
        }
        
        if (filters.grade) {
            query = query.where('grade', '==', filters.grade);
        }
        
        const snapshot = await query.get();
        
        let activities = [];
        snapshot.forEach(doc => {
            activities.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Filtrar por termo de busca (no frontend, pois Firestore não tem busca full-text)
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            activities = activities.filter(activity => 
                activity.title.toLowerCase().includes(term) ||
                activity.description.toLowerCase().includes(term) ||
                (activity.tags && activity.tags.some(tag => tag.toLowerCase().includes(term)))
            );
        }
        
        return activities;
        
    } catch (error) {
        console.error('Erro ao buscar atividades:', error);
        throw error;
    }
}
console.log('Funções do banco de dados carregadas!');
