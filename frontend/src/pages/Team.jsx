import { useState } from 'react';
import { useQuery, useMutation, gql } from 'urql';
import { Loader2, Users, Shield, User, Mail, ChevronDown } from 'lucide-react';

const GET_TEAM = gql`
  query GetTeam {
    me {
      id
      role
    }
    teamMembers {
      id
      name
      email
      role
    }
  }
`;

const INVITE_MEMBER = gql`
  mutation InviteMember($email: String!, $name: String!, $role: String!) {
    inviteTeamMember(email: $email, name: $name, role: $role) {
      id
      name
      email
      role
    }
  }
`;

const UPDATE_ROLE = gql`
  mutation UpdateRole($userId: Int!, $role: String!) {
    updateMemberRole(userId: $userId, role: $role) {
      id
      role
    }
  }
`;

export default function Team() {
  const [result, reexecuteQuery] = useQuery({ query: GET_TEAM });
  const { data, fetching, error } = result;

  const [inviteResult, executeInvite] = useMutation(INVITE_MEMBER);
  const [updateRoleResult, executeUpdateRole] = useMutation(UPDATE_ROLE);
  
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('Member');

  const currentUser = data?.me;
  const isAdmin = currentUser?.role === 'Admin';
  const teamMembers = data?.teamMembers || [];

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!newMemberEmail || !newMemberName) return;
    
    await executeInvite({ 
      email: newMemberEmail,
      name: newMemberName,
      role: newMemberRole
    });
    
    setNewMemberEmail('');
    setNewMemberName('');
    setNewMemberRole('Member');
    setShowInviteForm(false);
    reexecuteQuery({ requestPolicy: 'network-only' });
  };

  const handleRoleChange = async (userId, newRole) => {
    if (!isAdmin) return;
    await executeUpdateRole({ userId, role: newRole });
    reexecuteQuery({ requestPolicy: 'network-only' });
  };

  if (fetching && !data) {
    return <div className="p-12 text-center text-sm font-mono tracking-widest uppercase text-indigo-500 animate-pulse">Loading Team...</div>;
  }
  
  if (error) {
    return <div className="p-12 text-center text-sm font-mono tracking-widest text-red-500">Error: {error.message}</div>;
  }

  return (
    <div className="pt-4 pb-12 w-full h-full">
      <header className="mb-10 flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white mb-2">Team</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium tracking-wide">Manage your organization members and roles.</p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setShowInviteForm(!showInviteForm)}
            className="btn-primary flex items-center gap-2"
          >
            <Users size={18} />
            {showInviteForm ? 'Cancel' : 'Invite Member'}
          </button>
        )}
      </header>

      {showInviteForm && isAdmin && (
        <div className="glass-card p-8 mb-10 border-indigo-100 dark:border-indigo-900/50">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <Mail size={18} className="text-indigo-600 dark:text-indigo-400" />
            Invite a new team member
          </h3>
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <input 
                type="text" 
                placeholder="Full Name" 
                value={newMemberName}
                onChange={e => setNewMemberName(e.target.value)}
                className="glass-input flex-1"
                required
              />
              <input 
                type="email" 
                placeholder="Email Address" 
                value={newMemberEmail}
                onChange={e => setNewMemberEmail(e.target.value)}
                className="glass-input flex-1"
                required
              />
              <div className="relative">
                  <select 
                    value={newMemberRole}
                    onChange={e => setNewMemberRole(e.target.value)}
                    className="glass-input appearance-none pr-10 bg-white dark:bg-slate-800"
                  >
                  <option value="Member">Member</option>
                  <option value="Admin">Admin</option>
                </select>
                <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
            <div className="flex justify-end pt-2">
               <button type="submit" disabled={inviteResult.fetching} className="btn-primary w-40 flex justify-center">
                 {inviteResult.fetching ? <Loader2 className="animate-spin" size={20} /> : 'Send Invitation'}
               </button>
            </div>
          </form>
        </div>
      )}

      <div className="glass-card overflow-hidden">
        <div className="p-0">
          <div className="flex text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest p-5 border-b border-slate-100 dark:border-slate-700 bg-transparent">
            <div className="w-[40%]">Member</div>
            <div className="w-[40%]">Email</div>
            <div className="w-[20%] text-right">Role</div>
          </div>
          
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {teamMembers.length === 0 ? (
              <div className="py-16 text-sm text-slate-500 dark:text-slate-400 font-medium text-center bg-white dark:bg-slate-800">No team members found.</div>
            ) : (
              teamMembers.map((member) => {
                const initials = member.name ? member.name.substring(0, 2).toUpperCase() : '??';
                const isSelf = member.id === currentUser?.id;

                return (
                  <div key={member.id} className="list-row group flex p-5 items-center bg-white dark:bg-slate-800 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <div className="w-[40%] flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold text-sm border border-slate-200 dark:border-slate-600 shadow-sm">
                        {initials}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          {member.name}
                          {isSelf && <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] rounded-full uppercase tracking-wider font-bold">You</span>}
                        </span>
                      </div>
                    </div>
                    
                    <div className="w-[40%] text-sm text-slate-500 dark:text-slate-400 font-medium">
                      {member.email}
                    </div>
                    
                    <div className="w-[20%] flex justify-end">
                      {isAdmin && !isSelf ? (
                        <div className="relative inline-block">
                          <select 
                            value={member.role}
                            onChange={(e) => handleRoleChange(member.id, e.target.value)}
                            disabled={updateRoleResult.fetching}
                            className={`px-3 py-1.5 rounded-lg border text-xs font-bold appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm transition-colors pl-8 pr-8 ${
                              member.role === 'Admin' 
                               ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800/50' 
                               : 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                            }`}
                          >
                            <option value="Member">Member</option>
                            <option value="Admin">Admin</option>
                          </select>
                          <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                            {member.role === 'Admin' ? <Shield size={12} className="text-purple-600" /> : <User size={12} className="text-slate-500" />}
                          </div>
                          <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                      ) : (
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold shadow-sm ${
                          member.role === 'Admin' 
                           ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800/50' 
                           : 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                        }`}>
                          {member.role === 'Admin' ? <Shield size={12} /> : <User size={12} />}
                          {member.role}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
