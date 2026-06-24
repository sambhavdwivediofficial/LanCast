// src/hooks/useGroups.js
import useAppStore from "../store/appStore";

export default function useGroups() {
  const groups = useAppStore((s) => s.groups);
  return groups;
}
