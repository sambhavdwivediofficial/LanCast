use std::collections::HashMap;
use std::time::{SystemTime, UNIX_EPOCH};
use uuid::Uuid;

#[derive(Debug, Clone)]
pub struct Group {
    pub id: String,
    pub name: String,
    pub is_private: bool,
    pub members: Vec<String>,
    pub member_names: HashMap<String, String>,
    pub created_at: u64,
    pub created_by: String,
}

pub struct GroupManager {
    groups: HashMap<String, Group>,
}

impl GroupManager {
    pub fn new() -> Self {
        Self {
            groups: HashMap::new(),
        }
    }

    pub fn create_group(&mut self, name: String, is_private: bool, creator_name: String) -> Group {
        let id = Uuid::new_v4().to_string();
        let created_at = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64;

        let creator_id = Uuid::new_v4().to_string();
        let mut member_names = HashMap::new();
        member_names.insert(creator_id.clone(), creator_name.clone());

        let group = Group {
            id: id.clone(),
            name,
            is_private,
            members: vec![creator_id],
            member_names,
            created_at,
            created_by: creator_name,
        };

        self.groups.insert(id, group.clone());
        group
    }

    pub fn join_group(
        &mut self,
        group_id: &str,
        peer_id: String,
        peer_name: String,
    ) -> Result<(), String> {
        let group = self
            .groups
            .get_mut(group_id)
            .ok_or_else(|| format!("Group not found: {group_id}"))?;

        if !group.members.contains(&peer_id) {
            group.members.push(peer_id.clone());
            group.member_names.insert(peer_id, peer_name);
        }

        Ok(())
    }

    pub fn leave_group(&mut self, group_id: &str, peer_id: &str) {
        if let Some(group) = self.groups.get_mut(group_id) {
            group.members.retain(|m| m != peer_id);
            group.member_names.remove(peer_id);
        }
    }

    pub fn get_group(&self, group_id: &str) -> Option<&Group> {
        self.groups.get(group_id)
    }

    pub fn get_members(&self, group_id: &str) -> Option<Vec<String>> {
        self.groups.get(group_id).map(|g| g.members.clone())
    }

    pub fn get_member_count(&self, group_id: &str) -> usize {
        self.groups
            .get(group_id)
            .map(|g| g.members.len())
            .unwrap_or(0)
    }

    pub fn get_all_groups(&self) -> Vec<&Group> {
        self.groups.values().collect()
    }

    pub fn get_public_groups(&self) -> Vec<&Group> {
        self.groups.values().filter(|g| !g.is_private).collect()
    }

    pub fn remove_group(&mut self, group_id: &str) {
        self.groups.remove(group_id);
    }

    pub fn group_count(&self) -> usize {
        self.groups.len()
    }

    pub fn private_group_count(&self) -> usize {
        self.groups.values().filter(|g| g.is_private).count()
    }

    pub fn public_group_count(&self) -> usize {
        self.groups.values().filter(|g| !g.is_private).count()
    }
}

impl Default for GroupManager {
    fn default() -> Self {
        Self::new()
    }
}
