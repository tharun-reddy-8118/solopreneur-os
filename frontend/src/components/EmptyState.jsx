import { motion } from 'framer-motion';

export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl bg-slate-50/50 dark:bg-slate-800/30 w-full"
    >
      <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 dark:text-indigo-400 rounded-full flex items-center justify-center mb-6 shadow-sm">
        <Icon size={40} strokeWidth={1.5} />
      </div>
      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{title}</h3>
      <p className="text-slate-500 dark:text-slate-400 max-w-sm mb-8">
        {description}
      </p>
      {action}
    </motion.div>
  );
}
