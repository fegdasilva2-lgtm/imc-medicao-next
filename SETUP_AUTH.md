-- ===========================================
-- Script de Setup - Criar Admin no Supabase Auth
-- ===========================================
-- Rode este script após criar o projeto no Supabase
-- para criar o usuário admin no sistema de autenticação

-- Para criar o usuário admin no Supabase Auth, você tem 2 opções:

-- OPÇÃO 1: Via Dashboard do Supabase
-- 1. Acesse https://supabase.com/dashboard
-- 2. Vá em Authentication > Users
-- 3. Clique em "Add User"
-- 4. Preencha:
--    - Email: admin@imc-medicao.local
--    - Password: Admin@2026
--    - Confirm password: Admin@2026
-- 5. Clique em "Create user"

-- OPÇÃO 2: Via Supabase CLI (se tiver local)
-- npx supabase auth signin
-- npx supabase sms send

-- ===========================================
-- Após criar o usuário, o login estará disponível
-- com as credenciais:
-- - Username: admin
-- - Password: Admin@2026
-- ===========================================
