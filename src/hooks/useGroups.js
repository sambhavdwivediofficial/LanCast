import { useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import useAppStore from "@store/appStore";

export function useGroups() {
  const groups = useAppStore((s) => s.groups);
  const hiddenGroups = useAppStore((s) => s.hiddenGroups);
  const addGroup = useAppStore((s) => s.addGroup);
  const removeGroup = useAppStore((s) => s.removeGroup);

  const refresh = useCallback(async () => {
    try {
      const res = await invoke("get_groups");
      if (res?.data) {
        res.data.forEach((g) => addGroup({ ...g, joined: true }));
      }
    } catch {}
  }, [addGroup]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createGroup = useCallback(
    async (name, isPrivate) => {
      const res = await invoke("create_group", { payload: { name, isPrivate } });
      if (res?.data) {
        addGroup({
          ...res.data,
          createdByMe: true,
          joined: true,
          messages: [],
        });
      }
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

  const allGroups = Object.values(groups);
  const myGroups = allGroups.filter((g) => !hiddenGroups.has(g.groupId));
  const publicGroups = allGroups.filter((g) => !g.isPrivate && !hiddenGroups.has(g.groupId));
  const privateGroups = allGroups.filter((g) => g.isPrivate);

  return {
    groups: myGroups,
    groupMap: groups,
    myGroups,
    publicGroups,
    privateGroups,
    count: allGroups.length,
    createGroup,
    leaveGroup,
    refresh,
    getGroup: (id) => groups[id] ?? null,
  };
}
