'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

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
    const { error } = modo === 'entrar'
      ? await supabase.auth.signInWithPassword({ email, password: senha })
      : await supabase.auth.signUp({ email, password: senha });
    setEnviando(false);
    if (error) setErro(modo === 'entrar' ? 'E-mail ou senha incorretos' : error.message);
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
