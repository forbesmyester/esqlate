const { copyFileSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } = require('fs');
const { join: pathJoin } = require('path');
const { spawn, spawnSync } = require('child_process');
const download = require('download');

function getStat(filename) {
    if (!existsSync(filename)) {
        return false;
    }
    return statSync(filename);
}

function isCorrectStat(stat, type) {
    if (stat == false) {
        return false;
    }
    if (type == "f") {
        return stat.isFile();
    }
    if (type == "d") {
        return stat.isDirectory();
    }
    return true
}

function createDefinitionDirectory() {
    let definitionStat;
    try {
        definitionStat = getStat("./definition");
    } catch (e) {
    }
    if ((!definitionStat) || (!definitionStat.isDirectory())) {
        try {
            mkdirSync("./definition", { recurisve: true });
        } catch (e) {
        }
    }
    readdirSync("./dep-esqlate-server/example_definition").forEach((filename) => {
        copyFileSync(
            pathJoin("./dep-esqlate-server/example_definition", filename),
            pathJoin("definition", filename)
        );
    });
}

function myExecNoWait(cmd, args) {
    const out = spawnSync(cmd, args);
    if (out.status != 0) {
        console.error("Error running " + cmd + " " + JSON.stringify(args));
        console.error("");
        console.error("STDOUT: ");
        console.error(out.stdout.toString());
        console.error("");
        console.error("STDERR: ");
        console.error(out.stderr.toString());
        console.error("");
        process.exit(out.status);
    }
}

function myExec(cmd, args, opts) {

    return new Promise((resolve, reject) => {

        const server = spawn(cmd, args, opts);

        process.stdin.pipe(server.stdin);
        server.stdout.pipe(process.stdout);
        server.stderr.pipe(process.stderr);

        server.on('close', (code) => {
            if (code > 0) {
                return resolve({ status: 1, message: 'node ["dist/cmd.js", "serve"] exited with status ' + code});
            }
            return resolve({ status: 0 });
        });
    });

}


function server() {

    if (!isCorrectStat(getStat("./dep-esqlate-server"), "d")) {
        myExecNoWait(
            "git",
            ["clone", "https://github.com/forbesmyester/esqlate-server.git", "./dep-esqlate-server"]
        );
    }
    createDefinitionDirectory();
    process.chdir("./dep-esqlate-server/");
    myExecNoWait("git", ["checkout", "v1.2.0"]);

    if (!isCorrectStat(getStat("./dist/cmd.js"), "f")) {
        myExecNoWait("npm", ["install"]);
        myExecNoWait("npm", ["run-script", "build"]);
    }

    return myExec(
        "node",
        ["dist/cmd.js", "serve"],
        { env: { ...process.env, DEFINITION_DIRECTORY: "../definition" } }
    );

}

function front() {

    return Promise.resolve(isCorrectStat(getStat("./dep-esqlate-front.html"), "f"))
        .then((haveHtml) => {
            if (!haveHtml) {
                return download("https://github.com/forbesmyester/esqlate-front/releases/download/v1.1.2/index.html")
                    .then((bs) => { writeFileSync("./dep-esqlate-front.html", bs.toString()) })
            }
            return Promise.resolve(true);
        })
        .then(() => {
            return myExec(
                "wv_linewise",
                ["-t", "eSQLate", "-c", "dep-esqlate-front.html", "-s", "IN=-"],
                process.env
            );
        })
        .catch((e) => ({ status: 1, message: e.message }));

}

function run(f) {
    f()
        .then(({status, message}) => {
            if (status != 0) {
                console.error("Exit Status: " + status);
                console.error("");
                console.error(message);
            }
            process.exit(status);
        })
        .catch(e => {
            console.error(e);
            process.exit(1)
        });
}

switch (process.argv.length ? process.argv.slice(process.argv.length -1)[0] : "") {
    case "server":
        run(server);
        break;
    case "front":
        run(front);
        break;
    default:
        console.error("You must specifiy either \"server\" or \"front\"");
        process.exit(1);
}
