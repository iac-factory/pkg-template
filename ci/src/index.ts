import FS from "fs";
import Path from "path";
import Assertion from "assert";
import Subprocess from "child_process";

/// Current Working Directory - `undefined` if running externally (oddly enough)
const CWD = process.cwd() ?? null;

/// The actual current directory for the process if running external (`npx`)
const Initial = process.env?.["INIT_CWD"] ?? process.cwd();

( Initial !== null ) && process.chdir( Initial );

const Expression = new RegExp(
    "^(((https?\:\/\/)(((([a-zA-Z\\d][a-zA-Z\\d\-\_]{1,252})\.){1,8}[a-zA-Z]{2,63})\/))|((ssh\:\/\/)?git\@)(((([a-zA-Z\\d][a-zA-Z0-9\-\_]{1,252})\.){1,8}[a-zA-Z]{2,63})(\:)))([a-zA-Z0-9][a-zA-Z0-9\_\-]{1,36})(\/)([a-zA-Z0-9][a-zA-Z0-9\_\-]{1,36})((\.git)?)$" );

/***
 * Promisified Version of {@link FS.rm}
 * ---
 *
 * Asynchronously, recursively deletes the entire directory structure from target,
 * including subdirectories and files.
 *
 * @experimental
 *
 * @param {string} target
 * @returns {Promise<void>}
 *
 * @constructor
 *
 */
const Clean = async ( target: string ): Promise<null> => {
    /// console.debug( " - Cleaning (Deleting) Temporary Workspace ..." );
    return new Promise( ( resolve ) => {
        FS.rm( target, { recursive: true, force: true }, () => resolve( null ) );
    } );
};

/***
 * `git` Repository Clone Command
 * ---
 *
 * @param repository
 * @param branch
 * @param target
 * @returns {Promise<void>}
 *
 * @constructor
 *
 */
const Clone = async ( repository: string, branch: string, target = Path.join( CWD, "packages" ) ): Promise<void> => {
    console.log( "Cloning Repository from VCS ..." );

    const command = () => {
        console.log( " - Generating Spawn Command Partial(s) ..." );

        const partials = ( branch ) ? [
            "git", "clone", repository, "--branch", branch
        ] : [ "git", "clone", repository ];

        partials.push( target );

        const lexical = partials.join( " " )
            .replace( "$", "" )
            .replace( "{", "" )
            .replace( "}", "" )
            .replace( "(", "" )
            .replace( ")", "" );

        return lexical.split( " " );
    };

    const executable = command();

    const $ = () => new Promise( ( resolve, reject ) => {
        console.log( " - Spawning Non-Interactive \"git\" Clone Sub-Process ..." );

        const subprocess = Subprocess.spawn( executable[0], [ ... executable.splice( 1 ) ], {
            shell: false, env: process.env, stdio: "pipe"
        } );

        subprocess.stdout?.on( "data", ( chunk /*** @type {Buffer<Uint8Array>} */ ) => {
            const buffer = chunk.toString( "utf-8", 0, chunk.length );
            process.stdout.write( buffer );
        } );

        subprocess.stderr?.on( "data", ( chunk /*** @type {Buffer<Uint8Array>} */ ) => {
            console.error( chunk.toString() );
        } );

        subprocess.on( "message", ( message, handle ) => {
            console.log( message, handle );
        } );

        subprocess.on( "error", ( error ) => {
            console.warn( error );

            reject( error );
        } );

        subprocess.on( "exit", ( code, handle ) => {
            ( code !== 0 ) && reject( { code, handle } );
        } );

        subprocess.on( "close", async ( code, handle ) => {
            ( code !== 0 ) && reject( { code, handle } );

            const $ = await Checkout( target );

            resolve( $ );
        } );
    } );

    try {
        await $();
    } catch ( e ) {
        /// ...
        throw e;
    }
    finally {
        ( () => null )();
    }

    console.log( " - Established Local Repository", "\n" );
};

/***
 * `git` Repository Clone Command
 * ---
 *
 * @param repository
 * @param branch
 * @param target
 * @returns {Promise<void>}
 *
 * @constructor
 *
 */
const Checkout = ( directory: string ) => {
    return new Promise( ( resolve ) => {
        Subprocess.exec( "git for-each-ref --count=1 --sort=-committerdate refs/remotes/ --format='%(refname:short)'", {
            cwd: directory, env: process.env
        }, ( stderr, stdout, stdin ) => {
            const branch = stdout.replace( "origin/", "" );

            Subprocess.exec( [ "git checkout", branch ].join( " " ), {
                cwd: directory, env: process.env
            }, async ( stderr, stdout, stdin ) => {
                console.log( stdout /* stdin */ );

                const $ = await Install( directory );

                resolve( $ );
            } );
        } );
    } );
};

/***
 * Promisified Version of {@link FS.cp}
 * ---
 *
 * Asynchronously copies the entire directory structure from source to destination, including subdirectories and files.
 * - When copying a directory to another directory, globs are not supported.
 *
 * @experimental
 *
 * @param source {typeof import("fs").PathOrFileDescriptor} source path to copy.
 * @param target {typeof import("fs").PathOrFileDescriptor} destination path to copy to.
 * @returns {Promise<?>}
 *
 * @constructor
 *
 */
const Copy = async ( source: string, target: string ): Promise<string> => await new Promise( ( resolve ) => {
    console.debug( " - Copying" + " " + "\"" + source + "\"" + " " + "into" + " " + "\"" + target + "\"" + " " + "..." );
    FS.cp( source, target, {
            recursive: true,
            dereference: true,
            preserveTimestamps: false,
            errorOnExist: false,
            force: true
        }, () => {
            resolve( target );
        }
    );
} );

/***
 * `npm` Installer
 * ---
 *
 * @param directory {string}

 * @returns {Promise<boolean>}
 *
 * @constructor
 *
 */
const Install = async ( directory: string ): Promise<boolean | Error> => {
    const executable: readonly [ string, readonly [ string ] ] = [
        "npm", [
            "install"
        ]
    ];

    return new Promise( ( resolve, reject ) => {
        const subprocess = Subprocess.spawn( executable[0], [ ... executable[1] ], {
            shell: false, env: process.env, stdio: "pipe", cwd: directory
        } );

        subprocess.stdout?.on( "data", ( chunk: Buffer ) => {
            const buffer = chunk.toString( "utf-8", 0, chunk.length );
            process.stdout.write( buffer );
        } );

        subprocess.stderr?.on( "data", ( chunk: Buffer ) => {
            console.error( chunk.toString() );
        } );

        subprocess.on( "message", ( message: Subprocess.Serializable, handle: Subprocess.SendHandle ) => {
            console.log( message, handle );
        } );

        subprocess.on( "error", ( error: Error ) => {
            console.warn( error );

            reject( error );
        } );

        subprocess.on( "exit", ( code, handle ) => {
            ( code !== 0 ) && reject( { code, handle } );
        } );

        subprocess.on( "close", async ( code, handle ) => {
            ( code !== 0 ) && reject( { code, handle } );

            resolve( true );
        } );
    } );
};

( async () => {
    const data: string[] = [
        // ... Repository URL(s)
    ];

    Assertion.notStrictEqual((data.length === 0), true);

    for await ( const $ of data ) {
        const index = data.indexOf( $ );

        const branch = [ "Development", "main", "dev" ];

        const local = "." + Path.sep + "packages" + Path.sep + Expression.exec( $ )?.[17] ?? null;

        const target = local.replace( "_", "-" );

        await Clean( target );

        try {
            await Clone( $, branch[0], target );
        } catch ( e ) {
            try {
                await Clone( $, branch[1], target );
            } catch ( e ) {
                throw e;
            }
        }
    }

    FS.readdirSync( Path.join( CWD, "packages" ), { withFileTypes: true } ).forEach( ( $ ) => {
        ( $.isDirectory() ) && console.log( $.name );
    } );

    Subprocess.execSync( "npx --yes lerna@latest init", {
        env: process.env, stdio: "inherit", cwd: Initial, encoding: "utf-8"
    } );

    Subprocess.execSync( "npx lerna exec \"npm install\" --stream", {
        env: process.env, stdio: "inherit", cwd: Initial, encoding: "utf-8"
    } );

    Subprocess.execSync( "npx lerna bootstrap --npm-client npm", {
        env: process.env, stdio: "inherit", cwd: Initial, encoding: "utf-8"
    } );

    Subprocess.execSync( "npx lerna run start --stream", {
        env: process.env, stdio: "inherit", cwd: Initial, encoding: "utf-8"
    } );

    process.exit( 0 );
} )();

export {};
