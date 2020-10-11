import * as util from 'util';
import * as fs from 'fs';
import * as twitch_auth from 'twitch-auth';

class TwitchCreds {
    constructor(public client_id: string,
        public access_token: string,
        public client_secret: string,
        public refresh_token: string) { }
}

export class TwitchCredentialsNanny {
    private creds: TwitchCreds;
    private writingCreds: boolean = false;
    private authProvider: twitch_auth.RefreshableAuthProvider;

    constructor(credentials_file: string) {
        const rawdata = fs.readFileSync(credentials_file);
        let parsed = JSON.parse(rawdata.toString());
        this.creds = new TwitchCreds(parsed.client_id as string,
            parsed.access_token as string,
            parsed.client_secret as string,
            parsed.refresh_token as string
        );
    }

    getApiClient(): twitch_auth.RefreshableAuthProvider {
        if (this.authProvider) return this.authProvider;

        this.authProvider = new twitch_auth.RefreshableAuthProvider(
            new twitch_auth.StaticAuthProvider(this.creds.client_id, this.creds.access_token), {
            clientSecret: this.creds.client_secret,
            refreshToken: this.creds.refresh_token,
            onRefresh: (token: twitch_auth.AccessToken) => {
                this.creds.access_token = token.accessToken;
                this.creds.refresh_token = token.refreshToken;
                if (!this.writingCreds)
                    this.writeCredentials("secrets/twitch_secrets.json", this.creds).catch((err) => {
                        console.error(`Failed to write credentials : ${err}.`);
                    });
            }
        });
        return this.authProvider;
    }

    async readCredentials(file: string): Promise<TwitchCreds> {
        return new Promise((resolve, reject) => {
            const read = util.promisify(fs.readFile);
            read(file).then((rawdata) => {
                let parsed = JSON.parse(rawdata.toString());
                resolve(new TwitchCreds(parsed.client_id as string,
                    parsed.access_token as string,
                    parsed.client_secret as string,
                    parsed.refresh_token as string
                ));
            }).catch((err) => {
                reject(`Failed to read twitch credentials : ${err}`);
            });
        });
    }

    private writeCredentials(file: string, creds: TwitchCreds): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            // First check if the file already exists, if it does, 
            // then rename to a backup filename.
            const access = util.promisify(fs.access);
            access(file, fs.constants.F_OK).then(() => {
                const rename = util.promisify(fs.rename);
                rename(file, file + "." + Date.now().toString(10)).catch((err) => {
                    reject(`Failed to backup the credentials file before storing new credentials : ${err}.`);
                });
            }).catch((err) => {
                /* file does not exist, noop */
            }).finally(() => {
                let data = JSON.stringify(creds);
                const write = util.promisify(fs.writeFile);
                write(file, data).catch((err) => {
                    reject(`Failed to refresh twitch credentials file : ${err}`);
                }).finally(() => {
                    this.writingCreds = false;
                    console.log('Refreshed twitch credentials file.');
                    resolve();
                });
            });
        });
    }
}

export const credentials_nanny = new TwitchCredentialsNanny("secrets/twitch_secrets.json");