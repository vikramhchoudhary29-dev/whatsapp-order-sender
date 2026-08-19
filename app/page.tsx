"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import Papa from "papaparse";
import {
  Check,
  ChevronDown,
  Clock3,
  FileSpreadsheet,
  MessageCircle,
  MoreHorizontal,
  Pause,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";

type Customer = {
  id: string;
  name: string;
  phone: string;
  active: boolean;
  optedIn: boolean;
  createdAt: string;
  updatedAt: string;
};

type SettingsData = {
  id: string;
  morningEnabled: boolean;
  morningTime: string;
  eveningEnabled: boolean;
  eveningTime: string;
  timezone: string;
  template1Name: string;
  template1Language: string;
  template2Name: string;
  template2Language: string;
  selectedTemplate: number;
};

type CsvCustomer = {
  name?: string;
  phone?: string;
  optedIn?: string | boolean;
  active?: string | boolean;
};

type CsvPreviewRow = {
  row: number;
  name: string;
  phone: string;
  optedIn: boolean;
  active: boolean;
  valid: boolean;
  error?: string;
};

type Tab = "dashboard" | "customers";

export default function Home() {
  const [activeTab, setActiveTab] =
    useState<Tab>("dashboard");

  const [customers, setCustomers] = useState<Customer[]>(
    []
  );

  const [settings, setSettings] =
    useState<SettingsData | null>(null);

  const [loading, setLoading] = useState(true);

  const [showAddCustomer, setShowAddCustomer] =
    useState(false);

  const [showImport, setShowImport] =
    useState(false);

  const [showSettings, setShowSettings] =
    useState(false);

  const [showMenu, setShowMenu] =
    useState<string | null>(null);

  const [search, setSearch] = useState("");

  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [addForm, setAddForm] = useState({
    name: "",
    phone: "",
    optedIn: false,
    active: true,
  });

  const [savingCustomer, setSavingCustomer] =
    useState(false);

  const [csvRows, setCsvRows] = useState<
    CsvPreviewRow[]
  >([]);

  const [csvFileName, setCsvFileName] =
    useState("");

  const [importing, setImporting] =
    useState(false);

  const [settingsForm, setSettingsForm] =
    useState<SettingsData | null>(null);

  const [savingSettings, setSavingSettings] =
    useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = setTimeout(() => {
      setToast(null);
    }, 3500);

    return () => clearTimeout(timer);
  }, [toast]);

  async function loadData() {
    try {
      setLoading(true);

      const [customersResponse, settingsResponse] =
        await Promise.all([
          fetch("/api/customers"),
          fetch("/api/settings"),
        ]);

      if (!customersResponse.ok) {
        throw new Error(
          "Failed to load customers."
        );
      }

      if (!settingsResponse.ok) {
        throw new Error(
          "Failed to load settings."
        );
      }

      const customersData =
        await customersResponse.json();

      const settingsData =
        await settingsResponse.json();

      setCustomers(customersData);
      setSettings(settingsData);
      setSettingsForm(settingsData);
    } catch (error) {
      console.error(error);

      showToast(
        "error",
        "Could not load application data."
      );
    } finally {
      setLoading(false);
    }
  }

  function showToast(
    type: "success" | "error",
    message: string
  ) {
    setToast({
      type,
      message,
    });
  }

  const activeCustomers = useMemo(
    () =>
      customers.filter(
        (customer) =>
          customer.active &&
          customer.optedIn
      ),
    [customers]
  );

  const inactiveCustomers = useMemo(
    () =>
      customers.filter(
        (customer) => !customer.active
      ),
    [customers]
  );

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return customers;
    }

    return customers.filter(
      (customer) =>
        customer.name
          .toLowerCase()
          .includes(query) ||
        customer.phone
          .toLowerCase()
          .includes(query)
    );
  }, [customers, search]);

  async function handleAddCustomer(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!addForm.optedIn) {
      showToast(
        "error",
        "Opt-in is required before adding a customer."
      );

      return;
    }

    try {
      setSavingCustomer(true);

      const response = await fetch(
        "/api/customers",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(addForm),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to add customer."
        );
      }

      setCustomers((current) => [
        data,
        ...current,
      ]);

      setAddForm({
        name: "",
        phone: "",
        optedIn: false,
        active: true,
      });

      setShowAddCustomer(false);

      showToast(
        "success",
        "Customer added successfully."
      );
    } catch (error) {
      showToast(
        "error",
        error instanceof Error
          ? error.message
          : "Failed to add customer."
      );
    } finally {
      setSavingCustomer(false);
    }
  }

  async function updateCustomer(
    id: string,
    data: {
      active?: boolean;
      optedIn?: boolean;
      name?: string;
    }
  ) {
    try {
      const response = await fetch(
        `/api/customers/${id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        }
      );

      const updated =
        await response.json();

      if (!response.ok) {
        throw new Error(
          updated.error ||
            "Failed to update customer."
        );
      }

      setCustomers((current) =>
        current.map((customer) =>
          customer.id === id
            ? updated
            : customer
        )
      );

      setShowMenu(null);

      showToast(
        "success",
        "Customer updated."
      );
    } catch (error) {
      showToast(
        "error",
        error instanceof Error
          ? error.message
          : "Failed to update customer."
      );
    }
  }

  async function deleteCustomer(id: string) {
    const customer = customers.find(
      (item) => item.id === id
    );

    if (!customer) {
      return;
    }

    const confirmed = window.confirm(
      `Delete ${customer.name}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(
        `/api/customers/${id}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to delete customer."
        );
      }

      setCustomers((current) =>
        current.filter(
          (item) => item.id !== id
        )
      );

      setShowMenu(null);

      showToast(
        "success",
        "Customer deleted."
      );
    } catch (error) {
      showToast(
        "error",
        error instanceof Error
          ? error.message
          : "Failed to delete customer."
      );
    }
  }

  function normalizePhone(
    value: string
  ): string {
    let phone = value
      .trim()
      .replace(/[^\d+]/g, "");

    if (phone.startsWith("+")) {
      phone = phone.substring(1);
    }

    if (
      phone.startsWith("0") &&
      phone.length === 10
    ) {
      phone = `91${phone}`;
    }

    if (phone.length === 10) {
      phone = `91${phone}`;
    }

    return phone;
  }

  function parseCsvBoolean(
    value: unknown,
    defaultValue: boolean
  ): boolean {
    if (typeof value === "boolean") {
      return value;
    }

    if (typeof value !== "string") {
      return defaultValue;
    }

    const normalized = value
      .trim()
      .toLowerCase();

    if (
      ["true", "yes", "1"].includes(
        normalized
      )
    ) {
      return true;
    }

    if (
      ["false", "no", "0"].includes(
        normalized
      )
    ) {
      return false;
    }

    return defaultValue;
  }

  function handleCsvFile(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setCsvFileName(file.name);

    Papa.parse<CsvCustomer>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const preview: CsvPreviewRow[] =
          results.data.map(
            (row, index) => {
              const name =
                typeof row.name === "string"
                  ? row.name.trim()
                  : "";

              const phone =
                typeof row.phone === "string"
                  ? normalizePhone(row.phone)
                  : "";

              const optedIn =
                parseCsvBoolean(
                  row.optedIn,
                  false
                );

              const active =
                parseCsvBoolean(
                  row.active,
                  true
                );

              let error: string | undefined;

              if (!name) {
                error = "Missing name.";
              } else if (!phone) {
                error =
                  "Missing WhatsApp number.";
              } else if (
                !/^\d{10,15}$/.test(phone)
              ) {
                error =
                  "Invalid WhatsApp number.";
              } else if (!optedIn) {
                error =
                  "Opt-in is not confirmed.";
              }

              return {
                row: index + 2,
                name,
                phone,
                optedIn,
                active,
                valid: !error,
                error,
              };
            }
          );

        setCsvRows(preview);
      },
      error: (error) => {
        console.error(error);

        showToast(
          "error",
          "Could not read the CSV file."
        );
      },
    });
  }

  async function importCsv() {
    const validRows = csvRows.filter(
      (row) => row.valid
    );

    if (validRows.length === 0) {
      showToast(
        "error",
        "There are no valid rows to import."
      );

      return;
    }

    try {
      setImporting(true);

      const response = await fetch(
        "/api/customers",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            customers: validRows.map(
              (row) => ({
                name: row.name,
                phone: row.phone,
                optedIn: row.optedIn,
                active: row.active,
              })
            ),
          }),
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "CSV import failed."
        );
      }

      await loadData();

      setCsvRows([]);
      setCsvFileName("");
      setShowImport(false);

      showToast(
        "success",
        `${result.imported} imported, ${result.updated} updated.`
      );
    } catch (error) {
      showToast(
        "error",
        error instanceof Error
          ? error.message
          : "CSV import failed."
      );
    } finally {
      setImporting(false);
    }
  }

  async function saveSettings() {
    if (!settingsForm) {
      return;
    }

    try {
      setSavingSettings(true);

      const response = await fetch(
        "/api/settings",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            settingsForm
          ),
        }
      );

      const updated =
        await response.json();

      if (!response.ok) {
        throw new Error(
          updated.error ||
            "Failed to save settings."
        );
      }

      setSettings(updated);
      setSettingsForm(updated);
      setShowSettings(false);

      showToast(
        "success",
        "Settings saved."
      );
    } catch (error) {
      showToast(
        "error",
        error instanceof Error
          ? error.message
          : "Failed to save settings."
      );
    } finally {
      setSavingSettings(false);
    }
  }

  function formatPhone(phone: string) {
    if (
      phone.startsWith("91") &&
      phone.length === 12
    ) {
      return `+${phone}`;
    }

    return phone;
  }

  function templateLabel() {
    if (!settings) {
      return "Template 1";
    }

    return settings.selectedTemplate === 2
      ? settings.template2Name ||
          "Template 2"
      : settings.template1Name ||
          "Template 1";
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-600 text-white">
              <MessageCircle
                size={21}
              />
            </div>

            <div>
              <h1 className="text-lg font-semibold">
                WhatsApp Order Sender
              </h1>

              <p className="text-xs text-slate-500">
                Simple scheduled order reminders
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              setShowSettings(true)
            }
            className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Settings size={17} />
            Settings
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-6">
        <div className="mb-6 flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setActiveTab("dashboard")
            }
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              activeTab === "dashboard"
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-600 hover:bg-slate-100"
            }`}
          >
            Dashboard
          </button>

          <button
            type="button"
            onClick={() =>
              setActiveTab("customers")
            }
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              activeTab === "customers"
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-600 hover:bg-slate-100"
            }`}
          >
            Customers
          </button>
        </div>

        {activeTab === "dashboard" ? (
          <>
            <div className="mb-6">
              <h2 className="text-2xl font-semibold tracking-tight">
                Dashboard
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Manage your automated WhatsApp order messages.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <StatCard
                icon={<Users size={20} />}
                label="Total customers"
                value={customers.length}
              />

              <StatCard
                icon={<Check size={20} />}
                label="Active + opted in"
                value={activeCustomers.length}
              />

              <StatCard
                icon={<Pause size={20} />}
                label="Inactive"
                value={inactiveCustomers.length}
              />
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <ScheduleCard
                title="Morning"
                time={
                  settings?.morningTime ||
                  "09:00"
                }
                enabled={
                  settings?.morningEnabled ??
                  true
                }
              />

              <ScheduleCard
                title="Evening"
                time={
                  settings?.eveningTime ||
                  "18:00"
                }
                enabled={
                  settings?.eveningEnabled ??
                  true
                }
              />
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Ready to send
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    {activeCustomers.length} active,
                    opted-in customers will receive the selected template.
                  </p>

                  <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                    <MessageCircle
                      size={14}
                    />
                    {templateLabel()}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    showToast(
                      "success",
                      "Send Now will be connected to Meta in the next phase."
                    )
                  }
                  className="flex items-center justify-center gap-2 rounded-xl bg-green-600 px-5 py-3 text-sm font-semibold text-white hover:bg-green-700"
                >
                  <Send size={17} />
                  Send Now
                </button>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex items-start gap-3">
                <Clock3
                  size={20}
                  className="mt-0.5 text-slate-500"
                />

                <div>
                  <p className="font-medium">
                    Automatic schedule
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    The background scheduler will send the selected approved template at the configured times. The web dashboard does not need to stay open.
                  </p>

                  <p className="mt-3 text-xs font-medium text-slate-400">
                    Timezone:{" "}
                    {settings?.timezone ||
                      "Asia/Kolkata"}
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight">
                  Customers
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Only active and opted-in customers will receive messages.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setShowImport(true)
                  }
                  className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium hover:bg-slate-50"
                >
                  <Upload size={17} />
                  Import CSV
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setShowAddCustomer(true)
                  }
                  className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
                >
                  <Plus size={17} />
                  Add customer
                </button>
              </div>
            </div>

            <div className="mb-4 flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
              <Search
                size={18}
                className="text-slate-400"
              />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search customer or WhatsApp number..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
              />

              {search && (
                <button
                  type="button"
                  onClick={() =>
                    setSearch("")
                  }
                  className="text-slate-400 hover:text-slate-700"
                >
                  <X size={17} />
                </button>
              )}
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {loading ? (
                <div className="flex items-center justify-center px-6 py-16 text-sm text-slate-500">
                  Loading customers...
                </div>
              ) : filteredCustomers.length ===
                0 ? (
                <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                    <Users
                      size={22}
                      className="text-slate-400"
                    />
                  </div>

                  <p className="font-medium">
                    No customers found
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    Add a customer or import your CSV list.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left">
                    <thead className="border-b border-slate-200 bg-slate-50">
                      <tr>
                        <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Customer
                        </th>

                        <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          WhatsApp
                        </th>

                        <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Status
                        </th>

                        <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Opt-in
                        </th>

                        <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Action
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {filteredCustomers.map(
                        (customer) => (
                          <tr
                            key={
                              customer.id
                            }
                            className="hover:bg-slate-50"
                          >
                            <td className="px-5 py-4">
                              <p className="text-sm font-medium text-slate-900">
                                {
                                  customer.name
                                }
                              </p>
                            </td>

                            <td className="px-5 py-4 text-sm text-slate-600">
                              {formatPhone(
                                customer.phone
                              )}
                            </td>

                            <td className="px-5 py-4">
                              <button
                                type="button"
                                onClick={() =>
                                  updateCustomer(
                                    customer.id,
                                    {
                                      active:
                                        !customer.active,
                                    }
                                  )
                                }
                                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                                  customer.active
                                    ? "bg-green-100 text-green-700"
                                    : "bg-slate-100 text-slate-500"
                                }`}
                              >
                                {customer.active
                                  ? "Active"
                                  : "Inactive"}
                              </button>
                            </td>

                            <td className="px-5 py-4">
                              <button
                                type="button"
                                onClick={() =>
                                  updateCustomer(
                                    customer.id,
                                    {
                                      optedIn:
                                        !customer.optedIn,
                                    }
                                  )
                                }
                                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                                  customer.optedIn
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-red-100 text-red-700"
                                }`}
                              >
                                {customer.optedIn
                                  ? "Opted in"
                                  : "Not opted in"}
                              </button>
                            </td>

                            <td className="relative px-5 py-4 text-right">
                              <button
                                type="button"
                                onClick={() =>
                                  setShowMenu(
                                    showMenu ===
                                      customer.id
                                      ? null
                                      : customer.id
                                  )
                                }
                                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                              >
                                <MoreHorizontal
                                  size={18}
                                />
                              </button>

                              {showMenu ===
                                customer.id && (
                                <div className="absolute right-5 top-12 z-20 w-44 rounded-xl border border-slate-200 bg-white p-1 text-left shadow-lg">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateCustomer(
                                        customer.id,
                                        {
                                          active:
                                            !customer.active,
                                        }
                                      )
                                    }
                                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-slate-50"
                                  >
                                    {customer.active ? (
                                      <Pause
                                        size={15}
                                      />
                                    ) : (
                                      <Play
                                        size={15}
                                      />
                                    )}

                                    {customer.active
                                      ? "Deactivate"
                                      : "Activate"}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateCustomer(
                                        customer.id,
                                        {
                                          optedIn:
                                            !customer.optedIn,
                                        }
                                      )
                                    }
                                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-slate-50"
                                  >
                                    <Check
                                      size={15}
                                    />

                                    {customer.optedIn
                                      ? "Remove opt-in"
                                      : "Mark opted-in"}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      deleteCustomer(
                                        customer.id
                                      )
                                    }
                                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                                  >
                                    <Trash2
                                      size={15}
                                    />
                                    Delete
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {showAddCustomer && (
        <Modal
          title="Add customer"
          onClose={() =>
            setShowAddCustomer(false)
          }
        >
          <form
            onSubmit={handleAddCustomer}
            className="space-y-5"
          >
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Customer name
              </label>

              <input
                value={addForm.name}
                onChange={(event) =>
                  setAddForm({
                    ...addForm,
                    name: event.target.value,
                  })
                }
                placeholder="Rahul"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">
                WhatsApp number
              </label>

              <input
                value={addForm.phone}
                onChange={(event) =>
                  setAddForm({
                    ...addForm,
                    phone: event.target.value,
                  })
                }
                placeholder="919876543210"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500"
                required
              />

              <p className="mt-1.5 text-xs text-slate-400">
                Example: 919876543210
              </p>
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3">
              <input
                type="checkbox"
                checked={addForm.optedIn}
                onChange={(event) =>
                  setAddForm({
                    ...addForm,
                    optedIn:
                      event.target.checked,
                  })
                }
                className="mt-0.5 h-4 w-4"
              />

              <span>
                <span className="block text-sm font-medium">
                  Customer has opted in
                </span>

                <span className="mt-0.5 block text-xs text-slate-500">
                  Required before automated WhatsApp messages can be sent.
                </span>
              </span>
            </label>

            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={addForm.active}
                onChange={(event) =>
                  setAddForm({
                    ...addForm,
                    active:
                      event.target.checked,
                  })
                }
                className="h-4 w-4"
              />

              <span className="text-sm font-medium">
                Active customer
              </span>
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() =>
                  setShowAddCustomer(false)
                }
                className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={savingCustomer}
                className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
              >
                {savingCustomer
                  ? "Adding..."
                  : "Add customer"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {showImport && (
        <Modal
          title="Import customers"
          onClose={() => {
            setShowImport(false);
            setCsvRows([]);
            setCsvFileName("");
          }}
          wide
        >
          <div className="space-y-5">
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
              <FileSpreadsheet
                size={28}
                className="mx-auto text-slate-400"
              />

              <p className="mt-3 text-sm font-medium">
                Select your customer CSV
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Required columns: name, phone, optedIn
              </p>

              <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white">
                <Upload size={16} />
                Choose CSV
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={
                    handleCsvFile
                  }
                  className="hidden"
                />
              </label>

              {csvFileName && (
                <p className="mt-3 text-xs text-slate-500">
                  {csvFileName}
                </p>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-sm font-semibold">
                CSV format
              </p>

              <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-900 p-4 text-xs text-slate-200">
{`name,phone,optedIn,active
Rahul,919876543210,yes,yes
Priya,919812345678,yes,yes`}
              </pre>

              <p className="mt-2 text-xs text-slate-500">
                Only rows with confirmed opt-in will be imported as eligible customers.
              </p>
            </div>

            {csvRows.length > 0 && (
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold">
                    Preview
                  </p>

                  <p className="text-xs text-slate-500">
                    {
                      csvRows.filter(
                        (row) =>
                          row.valid
                      ).length
                    }{" "}
                    valid /{" "}
                    {csvRows.length}{" "}
                    total
                  </p>
                </div>

                <div className="max-h-64 overflow-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-sm">
                    <thead className="sticky top-0 bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-xs">
                          Row
                        </th>

                        <th className="px-3 py-2 text-xs">
                          Name
                        </th>

                        <th className="px-3 py-2 text-xs">
                          Phone
                        </th>

                        <th className="px-3 py-2 text-xs">
                          Status
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {csvRows.map(
                        (row) => (
                          <tr
                            key={
                              row.row
                            }
                          >
                            <td className="px-3 py-2 text-xs text-slate-500">
                              {row.row}
                            </td>

                            <td className="px-3 py-2 text-xs">
                              {row.name ||
                                "—"}
                            </td>

                            <td className="px-3 py-2 text-xs">
                              {row.phone ||
                                "—"}
                            </td>

                            <td className="px-3 py-2">
                              {row.valid ? (
                                <span className="text-xs font-medium text-green-600">
                                  Ready
                                </span>
                              ) : (
                                <span className="text-xs font-medium text-red-600">
                                  {row.error}
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowImport(false);
                  setCsvRows([]);
                  setCsvFileName("");
                }}
                className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={
                  importing ||
                  csvRows.filter(
                    (row) =>
                      row.valid
                  ).length === 0
                }
                onClick={importCsv}
                className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                {importing
                  ? "Importing..."
                  : "Import customers"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {showSettings &&
        settingsForm && (
          <Modal
            title="Schedule & template settings"
            onClose={() =>
              setShowSettings(false)
            }
          >
            <div className="space-y-6">
              <div>
                <p className="mb-3 text-sm font-semibold">
                  Schedule
                </p>

                <div className="space-y-3">
                  <ScheduleSetting
                    label="Morning"
                    enabled={
                      settingsForm.morningEnabled
                    }
                    time={
                      settingsForm.morningTime
                    }
                    onEnabledChange={(
                      value
                    ) =>
                      setSettingsForm({
                        ...settingsForm,
                        morningEnabled:
                          value,
                      })
                    }
                    onTimeChange={(
                      value
                    ) =>
                      setSettingsForm({
                        ...settingsForm,
                        morningTime:
                          value,
                      })
                    }
                  />

                  <ScheduleSetting
                    label="Evening"
                    enabled={
                      settingsForm.eveningEnabled
                    }
                    time={
                      settingsForm.eveningTime
                    }
                    onEnabledChange={(
                      value
                    ) =>
                      setSettingsForm({
                        ...settingsForm,
                        eveningEnabled:
                          value,
                      })
                    }
                    onTimeChange={(
                      value
                    ) =>
                      setSettingsForm({
                        ...settingsForm,
                        eveningTime:
                          value,
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <p className="mb-3 text-sm font-semibold">
                  WhatsApp templates
                </p>

                <div className="space-y-3">
                  <TemplateOption
                    number={1}
                    name={
                      settingsForm.template1Name
                    }
                    language={
                      settingsForm.template1Language
                    }
                    selected={
                      settingsForm.selectedTemplate ===
                      1
                    }
                    onSelect={() =>
                      setSettingsForm({
                        ...settingsForm,
                        selectedTemplate: 1,
                      })
                    }
                    onNameChange={(
                      value
                    ) =>
                      setSettingsForm({
                        ...settingsForm,
                        template1Name:
                          value,
                      })
                    }
                    onLanguageChange={(
                      value
                    ) =>
                      setSettingsForm({
                        ...settingsForm,
                        template1Language:
                          value,
                      })
                    }
                  />

                  <TemplateOption
                    number={2}
                    name={
                      settingsForm.template2Name
                    }
                    language={
                      settingsForm.template2Language
                    }
                    selected={
                      settingsForm.selectedTemplate ===
                      2
                    }
                    onSelect={() =>
                      setSettingsForm({
                        ...settingsForm,
                        selectedTemplate: 2,
                      })
                    }
                    onNameChange={(
                      value
                    ) =>
                      setSettingsForm({
                        ...settingsForm,
                        template2Name:
                          value,
                      })
                    }
                    onLanguageChange={(
                      value
                    ) =>
                      setSettingsForm({
                        ...settingsForm,
                        template2Language:
                          value,
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Timezone
                </label>

                <input
                  value={
                    settingsForm.timezone
                  }
                  onChange={(event) =>
                    setSettingsForm({
                      ...settingsForm,
                      timezone:
                        event.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setShowSettings(false)
                  }
                  className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={
                    savingSettings
                  }
                  onClick={saveSettings}
                  className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
                >
                  {savingSettings
                    ? "Saving..."
                    : "Save settings"}
                </button>
              </div>
            </div>
          </Modal>
        )}

      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex max-w-sm items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg ${
            toast.type === "success"
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {toast.type === "success" ? (
            <Check size={17} />
          ) : (
            <X size={17} />
          )}

          {toast.message}
        </div>
      )}
    </main>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
          {icon}
        </div>

        <span className="text-2xl font-semibold">
          {value}
        </span>
      </div>

      <p className="mt-4 text-sm text-slate-500">
        {label}
      </p>
    </div>
  );
}

function ScheduleCard({
  title,
  time,
  enabled,
}: {
  title: string;
  time: string;
  enabled: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <p className="mt-2 text-3xl font-semibold">
            {time}
          </p>
        </div>

        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            enabled
              ? "bg-green-100 text-green-700"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          {enabled
            ? "Enabled"
            : "Disabled"}
        </span>
      </div>
    </div>
  );
}

function ScheduleSetting({
  label,
  enabled,
  time,
  onEnabledChange,
  onTimeChange,
}: {
  label: string;
  enabled: boolean;
  time: string;
  onEnabledChange: (
    value: boolean
  ) => void;
  onTimeChange: (
    value: string
  ) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
      <div>
        <p className="text-sm font-medium">
          {label}
        </p>

        <label className="mt-1 flex items-center gap-2 text-xs text-slate-500">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) =>
              onEnabledChange(
                event.target.checked
              )
            }
          />
          Enabled
        </label>
      </div>

      <input
        type="time"
        value={time}
        onChange={(event) =>
          onTimeChange(
            event.target.value
          )
        }
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
    </div>
  );
}

function TemplateOption({
  number,
  name,
  language,
  selected,
  onSelect,
  onNameChange,
  onLanguageChange,
}: {
  number: number;
  name: string;
  language: string;
  selected: boolean;
  onSelect: () => void;
  onNameChange: (
    value: string
  ) => void;
  onLanguageChange: (
    value: string
  ) => void;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        selected
          ? "border-green-500 bg-green-50/50"
          : "border-slate-200"
      }`}
    >
      <label className="flex cursor-pointer items-center gap-3">
        <input
          type="radio"
          name="selectedTemplate"
          checked={selected}
          onChange={onSelect}
        />

        <span className="text-sm font-semibold">
          Template {number}
        </span>
      </label>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <input
          value={name}
          onChange={(event) =>
            onNameChange(
              event.target.value
            )
          }
          placeholder="Meta template name"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-500"
        />

        <input
          value={language}
          onChange={(event) =>
            onLanguageChange(
              event.target.value
            )
          }
          placeholder="Language code e.g. en_US"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-500"
        />
      </div>
    </div>
  );
}

function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 p-4">
      <div
        className={`max-h-[90vh] w-full overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl ${
          wide ? "max-w-4xl" : "max-w-lg"
        }`}
      >
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            {title}
          </h3>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}