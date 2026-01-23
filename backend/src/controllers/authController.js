const { pool, query } = require('../config/db');
const { hashPassword, comparePassword, generateToken } = require('../utils/security');

// REGISTRO DE NOVA EMPRESA (SAAS)
const registerTenant = async (req, res) => {
    const client = await pool.connect();
    
    try {
        const { companyName, slug, email, password, name } = req.body;

        // Validação básica
        if (!companyName || !slug || !email || !password || !name) {
            return res.status(400).json({ message: 'Todos os campos são obrigatórios' });
        }

        // Inicia Transação (Atomicidade: cria tudo ou nada)
        await client.query('BEGIN');

        // 1. Verificar se Slug já existe
        const slugCheck = await client.query('SELECT id FROM tenants WHERE slug = $1', [slug]);
        if (slugCheck.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ message: 'Este identificador de empresa (slug) já está em uso.' });
        }

        // 2. Criar Tenant
        const tenantResult = await client.query(
            `INSERT INTO tenants (name, slug, plan_tier) 
             VALUES ($1, $2, 'basic') 
             RETURNING id`,
            [companyName, slug]
        );
        const newTenantId = tenantResult.rows[0].id;

        // 3. Hash da senha
        const hashedPassword = await hashPassword(password);

        // 4. Criar Usuário Admin vinculado ao Tenant
        const userResult = await client.query(
            `INSERT INTO users (tenant_id, name, email, password_hash, role, is_super_admin) 
             VALUES ($1, $2, $3, $4, 'admin', false) 
             RETURNING id, name, email, role`,
            [newTenantId, name, email, hashedPassword]
        );

        // Commit da Transação
        await client.query('COMMIT');

        const user = userResult.rows[0];
        
        // Gerar Token para login automático após registro
        const token = generateToken({ ...user, tenant_id: newTenantId });

        return res.status(201).json({
            message: 'Empresa registrada com sucesso!',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                tenantId: newTenantId,
                companyName: companyName
            }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Erro no registro:', error);
        
        // Tratamento de erro de chave única (ex: email duplicado dentro do tenant logicamente, embora seja novo tenant aqui)
        if (error.code === '23505') {
             return res.status(400).json({ message: 'Dados duplicados (Email ou Slug).' });
        }
        
        return res.status(500).json({ message: 'Erro interno no servidor ao registrar empresa.' });
    } finally {
        client.release();
    }
};

// LOGIN
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email e senha são obrigatórios' });
        }

        // Busca usuário pelo email
        // NOTA: Num sistema onde o mesmo email pode estar em vários tenants, 
        // precisaríamos pedir o 'slug' da empresa no login. 
        // Por simplificação inicial, pegaremos o primeiro usuário encontrado.
        const result = await query(
            `SELECT u.*, t.name as tenant_name, t.slug as tenant_slug 
             FROM users u 
             JOIN tenants t ON u.tenant_id = t.id 
             WHERE u.email = $1 LIMIT 1`,
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ message: 'Credenciais inválidas' });
        }

        const user = result.rows[0];
        const isMatch = await comparePassword(password, user.password_hash);

        if (!isMatch) {
            return res.status(401).json({ message: 'Credenciais inválidas' });
        }

        const token = generateToken(user);

        return res.json({
            message: 'Login realizado com sucesso',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                tenantId: user.tenant_id,
                tenantName: user.tenant_name
            }
        });

    } catch (error) {
        console.error('Erro no login:', error);
        return res.status(500).json({ message: 'Erro interno do servidor' });
    }
};

const getMe = async (req, res) => {
    // Rota para validar token e retornar dados do usuário atual
    // Os dados já estão em req.user graças ao middleware
    return res.json({ user: req.user });
};

module.exports = {
    registerTenant,
    login,
    getMe
};