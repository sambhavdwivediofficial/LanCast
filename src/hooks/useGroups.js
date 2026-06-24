import { useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import useAppStore from "@store/appStore";

export function useGroups() {
  const groups = useAppStore((s) => s.groups);
  const addGroup = useAppStore((s) => s.addGroup);
  const removeGroup = useAppStore((s) => s.removeGroup);

  const refresh = useCallback(async () => {
    try {
      const res = await invoke("get_groups");
      if (res?.data) {
        res.data.forEach((g) => addGroup(g));
      }
    } catch {}
  }, [addGroup]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createGroup = useCallback(
    async (name, isPrivate) => {
      const res = await invoke("create_group", { payload: { name, isPrivate } });
      if (res?.data) addGroup(res.data);
      return res?.data;
    },
    [addGroup]
  );

  const leaveGroup = useCallback(
    async (groupId) => {
      await invoke("leave_group", { groupId });
      removeGroup(groupId);
    },
    [removeGroup]
  );

  return {
    groups: Object.values(groups),
    groupMap: groups,
    myGroups: Object.values(groups),
    publicGroups: Object.values(groups).filter((g) => !g.isPrivate),
    privateGroups: Object.values(groups).filter((g) => g.isPrivate),
    count: Object.keys(groups).length,
    createGroup,
    leaveGroup,
    refresh,
    getGroup: (id) => groups[id] ?? null,
  };
}
