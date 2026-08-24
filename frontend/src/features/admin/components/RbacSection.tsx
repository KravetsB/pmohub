import React, { useState } from "react";
import { Check, Copy, Power, PowerOff, Trash2, X } from "lucide-react";
import { useAppContext } from "../../../store";
import { UserRole } from "../../../types";
import { generatePassword, truncateText } from "../../../utils";

export const RbacSection = () => {
  const {
    rolePermissions,
    updateRolePermission,
    users,
    updateUser,
    deleteUser,
    departments,
    addUser,
  } = useAppContext();
  const [deleteConfirm, setDeleteConfirm] = useState<{
    title: string;
    name: string;
    onConfirm: () => void;
  } | null>(null);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserDept, setNewUserDept] = useState("");
  const [newUserRole, setNewUserRole] = useState<UserRole>("USER");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const handleAddUser = () => {
    if (!newUserName.trim() || !newUserEmail.trim() || !newUserDept) {
      setError("Заповніть всі поля");
      return;
    }
    if (
      users.some((u) => u.email.toLowerCase() === newUserEmail.toLowerCase())
    ) {
      setError("Користувач з таким email вже існує");
      return;
    }

    const pwd = generatePassword();
    setGeneratedPassword(pwd);
    setCopied(false);

    addUser({
      id: "USR-" + Math.random().toString(36).substring(2, 8),
      name: newUserName.trim(),
      email: newUserEmail.trim().toLowerCase(),
      role: newUserRole,
      departmentId: newUserDept || undefined,
      password: pwd,
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="font-bold text-slate-800 mb-4">Матриця прав доступу</h3>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto max-w-full min-w-0">
          <table className="min-w-full divide-y divide-slate-200 text-sm table-fixed w-full min-w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Роль
                </th>
                <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Read-Only
                </th>
                <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Створення/Редагування
                </th>
                <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Видалення
                </th>
                <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Доступ до Адмін
                </th>
                <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Редагування архіву
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {rolePermissions.map((rp) => (
                <tr
                  key={rp.role}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-normal break-words min-w-0 font-bold text-slate-800">
                    {rp.role === "SUPER_ADMIN"
                      ? "Супер адмін (SUPER_ADMIN)"
                      : rp.role === "ADMIN"
                        ? "Адміністратор (ADMIN)"
                        : "Користувач (USER)"}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <input
                      type="checkbox"
                      checked={rp.isReadOnly}
                      onChange={(e) =>
                        updateRolePermission(rp.role, {
                          isReadOnly: e.target.checked,
                        })
                      }
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <input
                      type="checkbox"
                      checked={rp.canCreateEditProjects}
                      onChange={(e) =>
                        updateRolePermission(rp.role, {
                          canCreateEditProjects: e.target.checked,
                        })
                      }
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <input
                      type="checkbox"
                      checked={rp.canDeleteProjects}
                      onChange={(e) =>
                        updateRolePermission(rp.role, {
                          canDeleteProjects: e.target.checked,
                        })
                      }
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <input
                      type="checkbox"
                      checked={rp.canAccessAdmin}
                      onChange={(e) =>
                        updateRolePermission(rp.role, {
                          canAccessAdmin: e.target.checked,
                        })
                      }
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <input
                      type="checkbox"
                      checked={rp.canEditArchive ?? false}
                      onChange={(e) =>
                        updateRolePermission(rp.role, {
                          canEditArchive: e.target.checked,
                        })
                      }
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-slate-800">Користувачі системи</h3>
          <button
            onClick={() => setIsAddUserModalOpen(true)}
            className="bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 px-3 py-1.5 rounded-lg font-bold text-sm transition-colors shadow-sm"
          >
            + Додати користувача
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto max-w-full min-w-0">
          <table className="min-w-full divide-y divide-slate-200 text-sm table-fixed w-full min-w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">
                  ПІБ
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Ел. пошта
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Департамент
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Роль
                </th>
                <th className="px-6 py-4 text-right"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {(users || []).map((user) => (
                <tr
                  key={user.id}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-normal break-words min-w-0 font-bold text-slate-800">
                    {user.name}
                  </td>
                  <td className="px-6 py-4 whitespace-normal break-words min-w-0 text-slate-600">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 whitespace-normal break-words min-w-0 text-slate-600">
                    {departments.find((d) => d.id === user.departmentId)
                      ?.name || "—"}
                  </td>
                  <td className="px-6 py-4 whitespace-normal break-words min-w-0">
                    <select
                      value={user.role}
                      onChange={(e) =>
                        updateUser(user.id, {
                          role: e.target.value as UserRole,
                        })
                      }
                      className="border border-slate-300 rounded-lg px-2 py-1 bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-bold truncate"
                    >
                      <option value="SUPER_ADMIN">
                        Супер адмін (SUPER_ADMIN)
                      </option>
                      <option value="ADMIN">Адміністратор (ADMIN)</option>
                      <option value="USER">Користувач (USER)</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-normal break-words min-w-0 text-right">
                    <button
                      onClick={() =>
                        setDeleteConfirm({
                          title: "користувача",
                          name: user.name,
                          onConfirm: () => deleteUser(user.id),
                        })
                      }
                      className="text-slate-400 hover:text-rose-500 transition-colors"
                      title="Видалити"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {deleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex justify-center items-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-md my-auto shadow-2xl border border-slate-200 p-6 flex flex-col">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="p-2.5 bg-rose-100 rounded-xl">
                <Trash2 size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                Підтвердження видалення
              </h3>
            </div>
            <p className="text-slate-600 text-sm mb-6 leading-relaxed">
              Ви дійсно бажаєте видалити користувача{" "}
              <span className="font-bold text-slate-800">
                «{deleteConfirm.name}»
              </span>
              ? Цю дію неможливо скасувати.
            </p>
            <div className="flex justify-end gap-3 mt-auto">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg transition-colors"
              >
                Скасувати
              </button>
              <button
                onClick={() => {
                  deleteConfirm.onConfirm();
                  setDeleteConfirm(null);
                }}
                className="bg-rose-600 hover:bg-rose-700 text-white px-5 py-2 rounded-lg font-bold transition-colors shadow-sm"
              >
                Видалити
              </button>
            </div>
          </div>
        </div>
      )}

      {isAddUserModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex justify-center items-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] my-auto shadow-xl border border-slate-200 flex flex-col p-6 overflow-y-auto">
            <h3 className="text-xl font-bold text-slate-900 mb-6">
              {generatedPassword ? "Користувача створено" : "Новий користувач"}
            </h3>

            {generatedPassword ? (
              <div className="space-y-4">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-800 text-sm">
                  Користувач{" "}
                  <strong className="font-bold">{newUserName}</strong> успішно
                  доданий до системи. Передайте йому ці дані для входу:
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Ел. пошта
                  </label>
                  <div className="w-full border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 text-slate-800 font-medium">
                    {newUserEmail}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Тимчасовий пароль
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 text-slate-900 font-mono tracking-wider font-bold">
                      {generatedPassword}
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(generatedPassword);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="p-2.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-100 transition-colors"
                      title="Скопіювати пароль"
                    >
                      {copied ? <Check size={20} /> : <Copy size={20} />}
                    </button>
                  </div>
                </div>

                <div className="mt-8 flex justify-end">
                  <button
                    onClick={() => {
                      setIsAddUserModalOpen(false);
                      setNewUserName("");
                      setNewUserEmail("");
                      setNewUserDept("");
                      setGeneratedPassword("");
                    }}
                    className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-lg font-bold transition-colors w-full shadow-sm"
                  >
                    Закрити
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Ім'я та Прізвище
                    </label>
                    <input
                      type="text"
                      value={newUserName}
                      onChange={(e) => {
                        setNewUserName(e.target.value);
                        setError("");
                      }}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Ел. пошта
                    </label>
                    <input
                      type="email"
                      value={newUserEmail}
                      onChange={(e) => {
                        setNewUserEmail(e.target.value);
                        setError("");
                      }}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div className="min-w-0">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Департамент
                    </label>
                    <select
                      value={newUserDept}
                      onChange={(e) => {
                        setNewUserDept(e.target.value);
                        setError("");
                      }}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-500 outline-none truncate"
                    >
                      <option value="">Оберіть департамент</option>
                      {(departments || []).map((d) => (
                        <option key={d.id} value={d.id} title={d.name}>
                          {truncateText(d.name, 70)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="min-w-0">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Роль
                    </label>
                    <select
                      value={newUserRole}
                      onChange={(e) =>
                        setNewUserRole(e.target.value as UserRole)
                      }
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-500 outline-none truncate"
                    >
                      <option value="SUPER_ADMIN">
                        Супер адмін (SUPER_ADMIN)
                      </option>
                      <option value="ADMIN">Адміністратор (ADMIN)</option>
                      <option value="USER">Користувач (USER)</option>
                    </select>
                  </div>
                </div>

                {error && (
                  <p className="text-rose-600 text-sm mt-4 font-medium">
                    {error}
                  </p>
                )}

                <div className="mt-8 flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setIsAddUserModalOpen(false);
                      setError("");
                      setNewUserName("");
                      setNewUserEmail("");
                      setNewUserDept("");
                      setGeneratedPassword("");
                    }}
                    className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    Скасувати
                  </button>
                  <button
                    onClick={handleAddUser}
                    className="bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold transition-colors shadow-sm"
                  >
                    Додати
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
