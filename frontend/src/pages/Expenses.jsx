import { useState } from 'react';
import { useQuery, useMutation, gql } from 'urql';
import { Loader2, Plus, Trash2, Receipt, PieChart, TrendingDown } from 'lucide-react';

const GET_EXPENSES = gql`
  query GetExpenses {
    expenses {
      id
      amount
      category
      description
      date
    }
    me {
      currencyPreference
    }
  }
`;

const ADD_EXPENSE = gql`
  mutation AddExpense($amount: Float!, $category: String!, $description: String!, $date: String!) {
    addExpense(amount: $amount, category: $category, description: $description, date: $date) {
      id
    }
  }
`;

const DELETE_EXPENSE = gql`
  mutation DeleteExpense($expenseId: Int!) {
    deleteExpense(expenseId: $expenseId)
  }
`;

const CATEGORIES = ["Software", "Marketing", "Hardware", "Contractors", "Other"];

export default function Expenses() {
  const [result, reexecuteQuery] = useQuery({ query: GET_EXPENSES });
  const { data, fetching, error } = result;

  const [addResult, executeAdd] = useMutation(ADD_EXPENSE);
  const [deleteResult, executeDelete] = useMutation(DELETE_EXPENSE);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ amount: '', category: 'Software', description: '', date: new Date().toISOString().split('T')[0] });

  const currencySymbol = data?.me?.currencyPreference === 'EUR' ? '€' : 
                         data?.me?.currencyPreference === 'GBP' ? '£' : 
                         data?.me?.currencyPreference === 'INR' ? '₹' : '$';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.amount || isNaN(parseFloat(formData.amount))) return;
    
    await executeAdd({
      amount: parseFloat(formData.amount),
      category: formData.category,
      description: formData.description,
      date: formData.date
    });
    
    setIsModalOpen(false);
    setFormData({ amount: '', category: 'Software', description: '', date: new Date().toISOString().split('T')[0] });
    reexecuteQuery({ requestPolicy: 'network-only' });
  };

  const handleDelete = async (id) => {
    if (confirm("Are you sure you want to delete this expense?")) {
      await executeDelete({ expenseId: id });
      reexecuteQuery({ requestPolicy: 'network-only' });
    }
  };

  const totalExpenses = data?.expenses?.reduce((sum, exp) => sum + exp.amount, 0) || 0;

  // Calculate category breakdown
  const categoryTotals = {};
  data?.expenses?.forEach(exp => {
    categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
  });

  return (
    <div className="pt-4 pb-12 w-full h-full max-w-6xl mx-auto">
      <header className="flex justify-between items-end mb-12">
        <div>
          <h2 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white mb-2">Expenses</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium tracking-wide">Track your business costs and overhead.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn-primary flex items-center gap-2 shadow-md hover:shadow-lg transition-all duration-300">
          <Plus size={18} /> Log Expense
        </button>
      </header>

      {fetching ? (
        <div className="flex justify-center items-center h-64 text-indigo-500">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : error ? (
        <div className="text-red-500 text-center p-8">Error loading expenses</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Expense List */}
          <div className="lg:col-span-2">
            <div className="glass-card overflow-hidden bg-white">
              {data?.expenses?.length === 0 ? (
                <div className="p-16 text-center flex flex-col items-center justify-center">
                  <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mb-6">
                    <Receipt className="w-10 h-10 text-rose-400" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No Expenses Yet</h3>
                  <p className="text-slate-500 dark:text-slate-400 max-w-sm mb-6">Log your first business expense to track your true net profit.</p>
                  <button onClick={() => setIsModalOpen(true)} className="btn-primary flex items-center gap-2">
                    <Plus size={18} /> Log Expense
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                  {data.expenses.map(expense => (
                    <div key={expense.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between group gap-4 sm:gap-0">
                      <div className="flex items-center gap-4 w-full sm:w-auto">
                        <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-900/50 flex items-center justify-center text-slate-400 dark:text-slate-500 shrink-0">
                          <TrendingDown size={20} />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">{expense.description}</h4>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{new Date(parseInt(expense.date)).toLocaleDateString()}</span>
                            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded">{expense.category}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between w-full sm:w-auto sm:justify-end gap-6 pt-3 sm:pt-0 border-t sm:border-0 border-slate-100 dark:border-slate-700">
                        <span className="text-lg font-black text-rose-600">
                          -{currencySymbol}{expense.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}
                        </span>
                        <button onClick={() => handleDelete(expense.id)} disabled={deleteResult.fetching} className="text-slate-300 hover:text-red-500 transition-colors sm:opacity-0 group-hover:opacity-100 p-2 sm:p-0">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Breakdown */}
          <div className="lg:col-span-1 space-y-6">
            <div className="glass-card p-6 bg-slate-900 text-white">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Total Expenses</h3>
              <div className="text-4xl font-black">{currencySymbol}{totalExpenses.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
            </div>
            
            <div className="glass-card p-6 bg-white dark:bg-slate-800">
              <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
                <PieChart size={16} /> Category Breakdown
              </h3>
              
              {Object.keys(categoryTotals).length === 0 ? (
                <div className="text-sm text-slate-400 text-center py-4">No data</div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(categoryTotals).sort((a,b) => b[1] - a[1]).map(([cat, amount]) => {
                    const percentage = Math.round((amount / totalExpenses) * 100);
                    return (
                      <div key={cat}>
                        <div className="flex justify-between text-sm font-bold mb-1">
                          <span className="text-slate-700 dark:text-slate-300">{cat}</span>
                          <span className="text-slate-900 dark:text-white">{currencySymbol}{amount.toLocaleString()} ({percentage}%)</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500" style={{ width: `${percentage}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* New Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl w-full max-w-md shadow-2xl relative">
            <div className="p-8">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-6">Log Expense</h3>
              
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Description</label>
                  <input 
                    required 
                    type="text" 
                    placeholder="e.g. GitHub Copilot Subscription"
                    value={formData.description} 
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    className="glass-input"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Amount</label>
                    <div className="relative">
                      <span className="absolute left-4 top-3 text-slate-400 font-bold">{currencySymbol}</span>
                      <input 
                        required 
                        type="number" 
                        min="0"
                        step="0.01"
                        value={formData.amount} 
                        onChange={e => setFormData({...formData, amount: e.target.value})}
                        className="glass-input pl-8"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Date</label>
                    <input 
                      required 
                      type="date" 
                      value={formData.date} 
                      onChange={e => setFormData({...formData, date: e.target.value})}
                      className="glass-input"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Category</label>
                  <select 
                    required 
                    value={formData.category} 
                    onChange={e => setFormData({...formData, category: e.target.value})}
                    className="glass-input"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={addResult.fetching} className="btn-primary">
                    {addResult.fetching ? 'Saving...' : 'Save Expense'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
