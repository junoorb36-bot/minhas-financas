'use client';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { register } from '@/lib/actions';

export default function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [modo, setModo] = useState<'entrar' | 'cadastrar'>('entrar');
  const [enviando, setEnviando] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      if (modo === 'cadastrar') {
        const r = await register(email, senha);
        if (!r.ok) { setErro(r.erro ?? 'Erro ao criar a conta'); return; }
      }
      const res = await signIn('credentials', { email, password: senha, redirect: false });
      if (res?.error) setErro('E-mail ou senha incorretos');
      else window.location.href = '/';
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="auth-wrap">
      <form className="auth-card" onSubmit={submit}>
        <h1>Minhas Finanças</h1>
        {erro && <p className="auth-error">{erro}</p>}
        <input type="email" placeholder="E-mail" value={email} onChange={e => setEmail(e.target.value)} required />
        <input type="password" placeholder="Senha (mín. 6 caracteres)" value={senha} onChange={e => setSenha(e.target.value)} required minLength={6} />
        <button type="submit" disabled={enviando}>
          {enviando ? 'Aguarde…' : modo === 'entrar' ? 'Entrar' : 'Criar conta'}
        </button>
        <p style={{ marginTop: 12, fontSize: 13, textAlign: 'center' }}>
          <button type="button" className="hint-link" onClick={() => setModo(modo === 'entrar' ? 'cadastrar' : 'entrar')}>
            {modo === 'entrar' ? 'Criar uma conta' : 'Já tenho conta'}
          </button>
        </p>
      </form>
    </div>
  );
}
