import React, { useState } from "react";
import { Pencil, Power, PowerOff, Trash2, X } from "lucide-react";
import { useAppContext } from "../../../app/store";
import { CustomFieldType } from "../../../shared/types";

export const CustomFieldsSection = () => {
  const { customFields, addCustomField, deleteCustomField, updateCustomField } =
    useAppContext();
  const [deleteConfirm, setDeleteConfirm] = useState<{
    title: string;
    name: string;
    onConfirm: () => void;
  } | null>(null);
  const [editingField, setEditingField] = useState<
    (typeof customFields)[number] | null
  >(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState<CustomFieldType>("TEXT");
  const [editEntityType, setEditEntityType] = useState<"project" | "task">(
    "project",
  );
  const [editOptions, setEditOptions] = useState("");
  const [editShowInTable, setEditShowInTable] = useState(false);
  const [editShowInCards, setEditShowInCards] = useState(false);

  const [name, setName] = useState("");
  const [type, setType] = useState<CustomFieldType>("TEXT");
  const [entityType, setEntityType] = useState<"project" | "task">("project");
  const [optionsStr, setOptionsStr] = useState("");
  const [showInTable, setShowInTable] = useState(false);
  const [showInCards, setShowInCards] = useState(false);

  const handleAdd = () => {
    if (!name.trim()) return;
    const newField = {
      id: "cf_" + Math.random().toString(36).substring(2, 10),
      name,
      type,
      entityType,
      isRequired: false,
      showInTable,
      showInCards,
      options:
        type === "SELECT"
          ? optionsStr
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined,
    };
    addCustomField(newField);
    setName("");
    setOptionsStr("");
    setShowInTable(false);
    setShowInCards(false);
  };

  const openEdit = (field: (typeof customFields)[number]) => {
    setEditingField(field);
    setEditName(field.name);
    setEditType(field.type);
    setEditEntityType(field.entityType === "task" ? "task" : "project");
    setEditOptions(field.options?.join(", ") ?? "");
    setEditShowInTable(Boolean(field.showInTable));
    setEditShowInCards(Boolean(field.showInCards));
  };

  const saveEdit = () => {
    if (!editingField || !editName.trim()) return;
    updateCustomField(editingField.id, {
      name: editName.trim(),
      type: editType,
      entityType: editEntityType,
      isRequired: false,
      showInTable: editShowInTable,
      showInCards: editShowInCards,
      options:
        editType === "SELECT"
          ? editOptions
              .split(",")
              .map((value) => value.trim())
              .filter(Boolean)
          : undefined,
    });
    setEditingField(null);
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
        <h3 className="font-bold text-slate-800 mb-4">Створити нове поле</h3>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Назва поля
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="напр. Бюджет"
            />
          </div>
          <div className="min-w-0">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Тип сутності
            </label>
            <select
              value={entityType}
              onChange={(e) =>
                setEntityType(e.target.value as "project" | "task")
              }
              className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-500 outline-none truncate"
            >
              <option value="project">Проєкт</option>
              <option value="task">Операційна задача</option>
            </select>
          </div>
          <div className="min-w-0">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Тип даних
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as CustomFieldType)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-500 outline-none truncate"
            >
              <option value="TEXT">Текст</option>
              <option value="NUMBER">Число</option>
              <option value="SELECT">Випадаючий список (Select)</option>
              <option value="CHECKBOX">Прапорець (Checkbox)</option>
              <option value="RICHTEXT">Текст з форматуванням (Примітки)</option>
            </select>
          </div>
          <div className="flex flex-col justify-end">
            <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer mb-2">
              <input
                type="checkbox"
                checked={showInTable}
                onChange={(e) => setShowInTable(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
              />
              Показувати в таблиці
            </label>
            <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer mb-2">
              <input
                type="checkbox"
                checked={showInCards}
                onChange={(e) => setShowInCards(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
              />
              Показувати в картках
            </label>
          </div>
        </div>
        {type === "SELECT" && (
          <div className="mb-4">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Варіанти (через кому)
            </label>
            <input
              type="text"
              value={optionsStr}
              onChange={(e) => setOptionsStr(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="Option 1, Option 2"
            />
          </div>
        )}
        <button
          onClick={handleAdd}
          className="bg-indigo-500 text-white font-bold px-4 py-2 rounded-lg hover:bg-indigo-600 transition-colors"
        >
          Додати поле
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto max-w-full min-w-0">
        <table className="min-w-full divide-y divide-slate-200 text-sm table-fixed w-full min-w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">
                Назва
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">
                Сутність
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">
                Тип
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">
                Відображення
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">
                Статус
              </th>
              <th aria-label="Дії" className="w-32 py-4 pl-2 pr-3" />
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-100">
            {customFields.map((cf) => (
              <tr key={cf.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 whitespace-normal break-words min-w-0 font-bold text-slate-800">
                  {cf.name}
                </td>
                <td className="px-6 py-4 whitespace-normal break-words min-w-0 text-slate-500">
                  {cf.entityType === "project" ? "Проєкт" : "Операційна задача"}
                </td>
                <td className="px-6 py-4 whitespace-normal break-words min-w-0 text-slate-500">
                  {cf.type}{" "}
                  {cf.type === "SELECT" && (
                    <span className="text-xs">({cf.options?.join(", ")})</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-normal break-words min-w-0 text-slate-500 text-xs space-y-1">
                  {cf.showInTable && (
                    <div>
                      <span className="font-bold">Таблиця:</span> Так
                    </div>
                  )}
                  {cf.showInCards && (
                    <div>
                      <span className="font-bold">Картки:</span> Так
                    </div>
                  )}
                  {!cf.showInTable && !cf.showInCards && (
                    <div className="text-slate-400">Тільки в модалці</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-normal break-words min-w-0">
                  <span
                    className={`px-2 py-1 rounded text-xs font-bold uppercase ${cf.isActive !== false ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}
                  >
                    {cf.isActive !== false ? "Активно" : "Деактивовано"}
                  </span>
                </td>
                <td className="w-32 px-3 py-4 whitespace-nowrap text-right">
                  <div className="flex items-center justify-end gap-3">
                    <button
                      onClick={() => openEdit(cf)}
                      className="text-slate-400 transition-colors hover:text-indigo-600"
                      title="Редагувати поле"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() =>
                        updateCustomField(cf.id, {
                          isActive: cf.isActive === false ? true : false,
                        })
                      }
                      className={`text-slate-400 transition-colors ${cf.isActive !== false ? "hover:text-amber-500" : "hover:text-emerald-500"}`}
                      title={
                        cf.isActive !== false ? "Деактивувати" : "Активувати"
                      }
                    >
                      {cf.isActive !== false ? (
                        <PowerOff size={16} />
                      ) : (
                        <Power size={16} />
                      )}
                    </button>
                    <button
                      onClick={() =>
                        setDeleteConfirm({
                          title: "кастомне поле",
                          name: cf.name,
                          onConfirm: () => deleteCustomField(cf.id),
                        })
                      }
                      className="text-slate-400 hover:text-rose-500 transition-colors"
                      title="Видалити"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {customFields.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-8 text-center text-slate-400 font-medium"
                >
                  Немає кастомних полів
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editingField && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/50 p-3 backdrop-blur-sm sm:p-6">
          <div className="my-auto w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  Редагування поля
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Зміни застосуються до нових і наявних форм.
                </p>
              </div>
              <button
                onClick={() => setEditingField(null)}
                aria-label="Закрити"
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X size={22} />
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-bold text-slate-700 sm:col-span-2">
                Назва поля
                <input
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </label>
              <div className="block text-sm font-bold text-slate-700">
                Тип сутності
                <div className="mt-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-medium text-slate-500">
                  {editEntityType === "project"
                    ? "Проєкт"
                    : "Операційна задача"}
                </div>
              </div>
              <div className="block text-sm font-bold text-slate-700">
                Тип даних
                <div className="mt-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-medium text-slate-500">
                  {editType === "TEXT"
                    ? "Текст"
                    : editType === "NUMBER"
                      ? "Число"
                      : editType === "SELECT"
                        ? "Випадаючий список"
                        : editType === "CHECKBOX"
                          ? "Прапорець"
                          : "Текст з форматуванням"}
                </div>
              </div>
              {editType === "SELECT" && (
                <label className="block text-sm font-bold text-slate-700 sm:col-span-2">
                  Значення списку (через кому)
                  <input
                    value={editOptions}
                    onChange={(event) => setEditOptions(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Варіант 1, Варіант 2"
                  />
                </label>
              )}
              <div className="space-y-2 text-sm font-bold text-slate-700 sm:col-span-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editShowInTable}
                    onChange={(event) =>
                      setEditShowInTable(event.target.checked)
                    }
                  />
                  Показувати в таблиці
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editShowInCards}
                    onChange={(event) =>
                      setEditShowInCards(event.target.checked)
                    }
                  />
                  Показувати в картках
                </label>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setEditingField(null)}
                className="rounded-lg px-4 py-2 font-bold text-slate-600 hover:bg-slate-100"
              >
                Скасувати
              </button>
              <button
                onClick={saveEdit}
                disabled={!editName.trim()}
                className="rounded-lg bg-indigo-600 px-5 py-2 font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Зберегти зміни
              </button>
            </div>
          </div>
        </div>
      )}

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
              Ви дійсно бажаєте видалити кастомне поле{" "}
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
    </div>
  );
};
