'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import { Search, MoreHorizontal, Trash2, MessageSquareText } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

type ChatSession = {
  id: string;
  title: string;
  created_at: string;
};

export function PlannerHistory() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();

  const loadSessions = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('id, title, created_at')
        .order('created_at', { ascending: false });
        
      if (!error && data) {
        setSessions(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this chat history?')) {
      setDeletingId(id);
      try {
        const supabase = createClient();
        await supabase.from('chat_sessions').delete().eq('id', id);
        setSessions(sessions.filter((s) => s.id !== id));
      } catch (err) {
        console.error(err);
      } finally {
        setDeletingId(null);
      }
    }
  };

  const filteredSessions = sessions.filter(s => 
    s.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-full flex-col p-6 sm:p-10 max-w-[1000px] mx-auto w-full">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Chat History</h1>
        
        <div className="relative w-full max-w-[240px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search History" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-full border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 pb-20">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : filteredSessions.length > 0 ? (
          <div className="flex flex-col gap-3">
            {filteredSessions.map((session) => (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => router.push(`/planner?topic=${encodeURIComponent(session.title)}&sessionId=${session.id}`)}
                className="group relative flex cursor-pointer flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-lg bg-primary/10 p-2 text-primary">
                      <MessageSquareText size={16} />
                    </div>
                    <div>
                      <h3 className="text-[15px] font-bold text-slate-900 leading-snug line-clamp-2">
                        {session.title}
                      </h3>
                      <p className="mt-1.5 text-xs font-medium text-slate-400">
                        {new Date(session.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                  
                  <button
                    onClick={(e) => handleDelete(e, session.id)}
                    disabled={deletingId === session.id}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 opacity-0 group-hover:opacity-100 disabled:opacity-50"
                  >
                    {deletingId === session.id ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
                    ) : (
                      <Trash2 size={16} />
                    )}
                  </button>
                </div>
              </motion.div>
            ))}
            {filteredSessions.length >= 1 && (
               <div className="mt-8 text-center text-sm font-medium text-slate-400 pb-12">
                 There&apos;s nothing more
               </div>
            )}
          </div>
        ) : (
          <div className="flex h-60 flex-col items-center justify-center text-center">
            <MessageSquareText size={32} className="mb-4 text-slate-300" />
            <h3 className="text-lg font-semibold text-slate-900">No chat history</h3>
            <p className="mt-2 max-w-[250px] text-sm text-slate-500">
              {search ? "No chats match your search." : "Your previous AI Planner conversations will appear here."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
