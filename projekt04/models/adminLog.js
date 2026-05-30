import db from '../database.js';

export function logAdminAction(adminId, targetUserId, action, details = null) {
  db.prepare(`
    INSERT INTO admin_actions (admin_id, target_user_id, action, details)
    VALUES (?, ?, ?, ?)
  `).run(adminId, targetUserId, action, details);
}

export function getUnseenAdminActions(userId) {
  return db.prepare(`
    SELECT a.action, a.details, a.created_at, u.username AS adminName
    FROM admin_actions a
    JOIN users u ON a.admin_id = u.id
    WHERE a.target_user_id = ? AND a.seen = 0
    ORDER BY a.created_at DESC
  `).all(userId);
}

export function markAdminActionsAsSeen(userId) {
  db.prepare(`
    UPDATE admin_actions SET seen = 1
    WHERE target_user_id = ? AND seen = 0
  `).run(userId);
}