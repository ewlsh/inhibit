#!/usr/bin/env -S gjs -m

/* inhibit.js
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

import Gio from 'gi://Gio';

const applicationId = 'io.ewlsh.Inhibit';

export const inhibitableEvents = [
  "shutdown", "sleep", "idle", "handle-power-key", "handle-suspend-key", "handle-hibernate-key", "handle-lid-switch"
];

/** @typedef {"shutdown" | "sleep" | "idle" | "handle-power-key" | "handle-suspend-key" | "handle-hibernate-key" | "handle-lid-switch"} What */


// Based on https://www.freedesktop.org/software/systemd/man/latest/org.freedesktop.login1.html
const freedesktopLoginManagerXml = `
<node>
  <interface name="org.freedesktop.login1.Manager">
    <method name="Inhibit">
      <arg type="s" direction="in" name="what" />
      <arg type="s" direction="in" name="who" />
      <arg type="s" direction="in" name="why" />
      <arg type="s" direction="in" name="mode" />
      <arg type="h" direction="out" name="pipe_fd" />
    </method>
  </interface>
</node>`;

const createLoginManagerProxy = Gio.DBusProxy.makeProxyWrapper(freedesktopLoginManagerXml);

/**
 * @param {What} what
 * @param {string} why
 * @returns
 */
export function inhibit(what, why = 'user preference') {
  const loginManager = createLoginManagerProxy(Gio.DBus.system, 'org.freedesktop.login1', '/org/freedesktop/login1');

  const fdlist = new Gio.UnixFDList();
  const [pipefd, outputFdlist] = loginManager.InhibitSync(what, applicationId, why, 'block', fdlist)
  const fd = outputFdlist.steal_fds()[pipefd];

  return new Gio.UnixInputStream({ fd })
}

