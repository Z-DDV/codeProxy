import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { ToastProvider } from "@/modules/ui/ToastProvider";
import { ThemeProvider } from "@/modules/ui/ThemeProvider";
import { AuthFilesPage } from "@/modules/auth-files/AuthFilesPage";
import i18n from "@/i18n";

const mocks = vi.hoisted(() => ({
  list: vi.fn(async () => ({
    files: [
      {
        name: "kimi-alpha.json",
        type: "kimi",
        label: "alpha-channel",
        size: 1024,
        modified: Date.now(),
        disabled: false,
      },
      {
        name: "kimi-beta.json",
        type: "kimi",
        label: "beta-channel",
        size: 1024,
        modified: Date.now(),
        disabled: false,
      },
    ],
  })),
  channelGroupsList: vi.fn(async () => [
    { name: "team-a", channels: ["alpha-channel"] },
    { name: "team-b", channelDetails: [{ name: "beta-channel" }] },
  ]),
  getEntityStats: vi.fn(async () => ({ source: [], auth_index: [] })),
  getUsageLogs: vi.fn(async () => ({ items: [], total: 0, page: 1, size: 200 })),
  getAuthFileGroupTrend: vi.fn(async () => ({
    days: 7,
    group: "all",
    points: [{ date: new Date().toISOString().slice(0, 10), requests: 2 }],
  })),
  fetchQuota: vi.fn((_provider?: unknown, _file?: { name?: string }) => new Promise(() => {})),
  getModelsForAuthFile: vi.fn(async () => [{ id: "kimi-k2", owned_by: "moonshot" }]),
  getModelConfigs: vi.fn(async () => [{ id: "kimi-k2", owned_by: "moonshot" }]),
  getModelOwnerPresets: vi.fn(async () => [
    { value: "moonshot", label: "Moonshot", description: "Moonshot models", enabled: true },
  ]),
}));

vi.mock("@/lib/http/apis", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/http/apis")>();
  return {
    ...mod,
    authFilesApi: {
      ...mod.authFilesApi,
      list: mocks.list,
      getModelsForAuthFile: mocks.getModelsForAuthFile,
    },
    modelsApi: {
      ...mod.modelsApi,
      getModelConfigs: mocks.getModelConfigs,
      getModelOwnerPresets: mocks.getModelOwnerPresets,
    },
    usageApi: {
      ...mod.usageApi,
      getEntityStats: mocks.getEntityStats,
      getUsageLogs: mocks.getUsageLogs,
      getAuthFileGroupTrend: mocks.getAuthFileGroupTrend,
    },
  };
});

vi.mock("@/lib/http/apis/channel-groups", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/http/apis/channel-groups")>();
  return {
    ...mod,
    channelGroupsApi: {
      ...mod.channelGroupsApi,
      list: mocks.channelGroupsList,
    },
  };
});

vi.mock("@/modules/quota/quota-fetch", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/modules/quota/quota-fetch")>();
  return { ...mod, fetchQuota: mocks.fetchQuota };
});

vi.mock("@/modules/ui/charts/EChart", () => ({
  EChart: ({ className }: { className?: string }) => <div className={className}>chart</div>,
}));

describe("AuthFilesPage channel group filter", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
    window.localStorage.clear();
    window.sessionStorage.clear();

    mocks.list.mockClear();
    mocks.channelGroupsList.mockClear();
    mocks.getEntityStats.mockClear();
    mocks.getUsageLogs.mockClear();
    mocks.getAuthFileGroupTrend.mockClear();
    mocks.fetchQuota.mockClear();
    mocks.getModelsForAuthFile.mockClear();
    mocks.getModelConfigs.mockClear();
    mocks.getModelOwnerPresets.mockClear();
  });

  test("filters auth files by the selected channel group", async () => {
    render(
      <MemoryRouter initialEntries={["/auth-files"]}>
        <ThemeProvider>
          <ToastProvider>
            <Routes>
              <Route path="/auth-files" element={<AuthFilesPage />} />
            </Routes>
          </ToastProvider>
        </ThemeProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByText("alpha-channel")).toBeInTheDocument();
    expect(screen.getByText("beta-channel")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("combobox", { name: "Channel Group" }));
    fireEvent.click(screen.getByRole("option", { name: "team-a" }));

    await waitFor(() => {
      expect(screen.getByText("alpha-channel")).toBeInTheDocument();
      expect(screen.queryByText("beta-channel")).not.toBeInTheDocument();
    });
  });
});
