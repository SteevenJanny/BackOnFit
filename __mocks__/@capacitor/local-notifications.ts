export const _mockPermissionsGranted = {display: "granted"}
export const _mockScheduled: any[] = []

export const LocalNotifications = {

  checkPermissions: async () => {
    return _mockPermissionsGranted;
  },

  requestPermissions: async () => {
    _mockPermissionsGranted['display'] = "granted";
    return _mockPermissionsGranted;
  },

  schedule: async (options: any) => {
    _mockScheduled.push(...options.notifications);
    return;
  },

  cancel: async (options: any) => {
    const id = options.notifications[0].id;
    const index = _mockScheduled.findIndex(n => n.id === id);
    if (index !== -1) {
      _mockScheduled.splice(index, 1);
    }
    return;
  },

  getPending: async () => {
    return {notifications: _mockScheduled};
  }

}
