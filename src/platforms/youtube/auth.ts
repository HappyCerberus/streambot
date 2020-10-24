import { Auth } from "googleapis"
import * as fs from "fs"
import * as http from "http"
import * as url from "url"
import * as opn from "open"

class YouTubeCreds {
    constructor(public client_id: string,
        public client_secret: string,
        public redirect_uri: string) { }
}

export class YoutubeCredentialsNanny {
    private scopes = [
        'https://www.googleapis.com/auth/youtube.readonly',
        'https://www.googleapis.com/auth/youtube',
        'https://www.googleapis.com/auth/youtube.force-ssl',
    ];
    private creds: YouTubeCreds;
    private authProvider: Promise<Auth.OAuth2Client>;

    constructor(credentials_file: string) {
        const rawdata = fs.readFileSync(credentials_file);
        let parsed = JSON.parse(rawdata.toString());
        this.creds = new YouTubeCreds(parsed.web.client_id as string,
            parsed.web.client_secret as string,
            parsed.web.redirect_uris[0] as string
        );
    }

    private async authenticate(): Promise<Auth.OAuth2Client> {
        return new Promise<Auth.OAuth2Client>((resolve, reject) => {
            let oauth2Client = new Auth.OAuth2Client(this.creds.client_id, this.creds.client_secret, this.creds.redirect_uri);
            const authorizeUrl = oauth2Client.generateAuthUrl({
                access_type: 'offline',
                scope: this.scopes.join(' '),
            });

            const server = http.createServer(async (req: http.IncomingMessage, res: http.ServerResponse) => {
                try {
                    if (req.url === undefined) {
                        throw new Error("URL not filled for incoming request.");
                    }

                    if (req.url.indexOf('/oauth2callback') > -1) {
                        const qs = new url.URL(req.url, "http://localhost:3000")
                            .searchParams;
                        res.end('Authentication successful! Please return to the console.');
                        server.close();
                        let code = qs.get('code');
                        if (code === null) {
                            throw Error("Unable to read code from Oauth2 callback.");
                        }
                        const { tokens } = await oauth2Client.getToken(code);
                        oauth2Client.credentials = tokens; // eslint-disable-line require-atomic-updates
                        resolve(oauth2Client);
                    }
                } catch (e) {
                    reject(e);
                }
            })
                .listen(3000, () => {
                    // open the browser to the authorize url to start the workflow
                    console.log(authorizeUrl);
                    //opn(authorizeUrl, { wait: false }).then(cp => cp.unref());
                });
        });
    }

    async getApiClient(): Promise<Auth.OAuth2Client> {
        if (this.authProvider) {
            return this.authProvider;
        }
        this.authProvider = this.authenticate();
        return this.authProvider;
    }
}

export const credentials_nanny = new YoutubeCredentialsNanny("secrets/youtube_secrets.json");
