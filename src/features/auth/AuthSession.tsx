import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { checkSession, sessionExpired } from './authSlice';

export default function AuthSession() {
  const dispatch = useAppDispatch();
  const expiresAt = useAppSelector((state) => state.auth.session?.expiresAt);

  useEffect(() => {
    void dispatch(checkSession());
    const verify = () => {
      void dispatch(checkSession());
    };
    window.addEventListener('focus', verify);
    return () => window.removeEventListener('focus', verify);
  }, [dispatch]);

  useEffect(() => {
    if (!expiresAt) return;
    const timer = window.setTimeout(
      () => dispatch(sessionExpired()),
      Math.max(0, Date.parse(expiresAt) - Date.now())
    );
    return () => window.clearTimeout(timer);
  }, [dispatch, expiresAt]);

  return null;
}
