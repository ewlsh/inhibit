/* window.js
 *
 * Copyright 2024 Evan Welsh
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import GObject from 'gi://GObject';
import Adw from 'gi://Adw';

const InhibitType = {
  SUSPEND: 'sleep',
  IDLE: 'idle',
  LOGOUT: 'shutdown',
};
Object.freeze(InhibitType);

export class InhibitWindow extends Adw.ApplicationWindow {
  fds = [];

  /**
   * @param {import('./main.js').InhibitApplication} application
   */
  constructor(application) {
    super({ application, title: "Inhibit" });

    /** @type {Adw.PreferencesPage} */
    this._preferencesPage;

    const list = this.application.settings.get_strv('inhibited');

    this._suspendSwitchRow.active = list.includes(InhibitType.SUSPEND)
    this._idleSwitchRow.active = list.includes(InhibitType.IDLE)
    this._logoutSwitchRow.active = list.includes(InhibitType.LOGOUT)

    this._suspendSwitchRow.connect('notify::active', (row) => {
      const { settings } = this.application;
      let list = settings.get_strv('inhibited');
      if (row.active) {
        list = [...list, InhibitType.SUSPEND];
      } else {
        list = list.filter(value => value !== InhibitType.SUSPEND);
      }
      settings.set_strv('inhibited', list);
    });

    this._idleSwitchRow.connect('notify::active', (row) => {
      const { settings } = this.application;
      let list = settings.get_strv('inhibited');
      if (row.active) {
        list = [...list, InhibitType.IDLE];
      } else {
        list = list.filter(value => value !== InhibitType.IDLE);
      }
      settings.set_strv('inhibited', list);
    });

    this._logoutSwitchRow.connect('notify::active', (row) => {
      const { settings } = this.application;

      let list = settings.get_strv('inhibited');
      if (row.active) {
        list = [...list, InhibitType.LOGOUT];
      } else {
        list = list.filter(value => value !== InhibitType.LOGOUT);
      }

      settings.set_strv('inhibited', list);
    });

    this.application.settings.connect('changed::inhibited', (settings) => {
      const list = settings.get_strv('inhibited');

      const inhibitingSuspend = list.includes(InhibitType.SUSPEND);
      const inhibitingIdle = list.includes(InhibitType.IDLE);
      const inhibitingLogout = list.includes(InhibitType.LOGOUT);

      if (this._suspendSwitchRow.active !== inhibitingSuspend)
        this._suspendSwitchRow.active = inhibitingSuspend;

      if (this._idleSwitchRow.active !== inhibitingIdle)
        this._idleSwitchRow.active = inhibitingIdle

      if (this._logoutSwitchRow !== inhibitingLogout)
        this._logoutSwitchRow.active = inhibitingLogout
    });


  }
}

GObject.registerClass({
  GTypeName: 'InhibitWindow',
  Template: 'resource:///io/ewlsh/Inhibit/window.ui',
  InternalChildren: ['preferencesPage', 'suspendSwitchRow', 'logoutSwitchRow', 'idleSwitchRow'],
}, InhibitWindow);
