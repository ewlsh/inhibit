/* main.js
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

import 'gi://Gtk?version=4.0';

import GObject from 'gi://GObject';
import Gio from 'gi://Gio';
import Adw from 'gi://Adw?version=1';
import Xdp from 'gi://Xdp';
import XdpGtk4 from 'gi://XdpGtk4';

import { InhibitWindow } from './window.js';
import { inhibit, inhibitableEvents } from './inhibit.js';

pkg.initGettext();
pkg.initFormat();

export class InhibitApplication extends Adw.Application {
    #settings;
    #fds = [];
    #held = false;
    #mainWindow = null;
    #allowedToRunInBackground = false;

    constructor() {
        super({ applicationId: 'io.ewlsh.Inhibit', flags: Gio.ApplicationFlags.DEFAULT_FLAGS });

        this.#registerActions();

        this.#settings = new Gio.Settings({ schemaId: this.applicationId });
        this.#settings.connect('changed::inhibited', (settings) => {
            console.log('Clearing existing file descriptors');

            for (const stream of this.#fds) {
                stream.run_dispose();
            }

            this.#fds = [];

            const list = settings.get_strv('inhibited');

            for (const event of list) {
                if (inhibitableEvents.includes(event)) {
                    this.#fds.push(inhibit(event));
                }
            }
        });

        this.portal = Xdp.Portal.initable_new();
    }

    #registerActions() {
        const quitAction = new Gio.SimpleAction({ name: 'quit' });
        quitAction.connect('activate', () => {
            this.quit();
        });
        this.add_action(quitAction);
        this.set_accels_for_action('app.quit', ['<primary>q']);

        const showAboutAction = new Gio.SimpleAction({ name: 'about' });
        showAboutAction.connect('activate', () => {
            const aboutWindow = new Adw.AboutWindow({
                transient_for: this.active_window,
                application_name: 'Inhibit',
                application_icon: 'io.ewlsh.Inhibit',
                developer_name: 'Evan Welsh',
                version: '0.1.0',
                developers: [
                    'Evan Welsh'
                ],
                copyright: '© 2024 Evan Welsh'
            });
            aboutWindow.present();
        });
        this.add_action(showAboutAction);
    }

    vfunc_activate() {
        this.#allowedToRunInBackground = false;

        if (!this.#mainWindow) {
            this.#mainWindow = new InhibitWindow(this);

            this.#mainWindow.connect('close-request', () => {
                if (!this.#held) {
                  // Keep the application running temporarily to query the background
                  // portal...
                  this.hold();
                }

                if (this.#allowedToRunInBackground) {
                    this.portal.set_background_status('Keeping your computer awake', null, (portal, res) => {
                        const result = portal.set_background_status_finish(res);

                        if (result) {
                            console.log('Running Inhibit in the background');

                            this.#held = true;
                        } else {
                            console.log('Failed to run Inhibit in the background');

                            this.release();

                            this.#held = false;
                        }
                    });
                } else {
                    this.release();

                    this.#held = false;
                }
            });

        }

        const mainWindow = this.#mainWindow;

        if (!mainWindow.visible) {
            mainWindow.visible = true;
        }

        mainWindow.present();

        this.portal.request_background(XdpGtk4.parent_new_gtk(mainWindow), "To keep computer from sleeping", ['inhibit'], 0, null, (portal, res) => {
            const result = portal.request_background_finish(res);

            this.#allowedToRunInBackground = result;
        });
    }

    get settings() {
        return this.#settings;
    }
}

GObject.registerClass(
    InhibitApplication
);

export function main(argv) {
    const application = new InhibitApplication();

    return application.runAsync(argv);
}
