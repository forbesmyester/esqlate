const { copyFileSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } = require('fs');
const { join: pathJoin, resolve } = require('path');
const { spawn, spawnSync } = require('child_process');
const download = require('download');
const { createInterface } = require('readline');

const esqlateServerVersion = "v1.2.1"
const esqlateFrontVersion = "v1.1.3"


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
    const outStatus = out.status
    if (out.status != 0) {
        console.error("Error running " + cmd + " " + JSON.stringify(args));
        console.error("");
        console.error("EXIT: " + outStatus);
        console.error("");
        console.error("STDOUT: ");
        console.error((out.stdout || "").toString());
        console.error("");
        console.error("STDERR: ");
        console.error((out.stderr || "").toString());
        console.error("");
        console.error("ERROR: ");
        console.error((out.error || "").toString());
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


function checkout(repo, dest, version) {
    if (!isCorrectStat(getStat(dest), "d")) {
        myExecNoWait(
            "git",
            ["clone", repo, dest]
        );
    }
    if (version !== undefined) {
        let oldDir = process.cwd();
        process.chdir(dest);
        myExecNoWait("git", ["checkout", version]);
        process.chdir(oldDir);
    }
    return Promise.resolve({ status: 0 });
}


function checkoutServer() {
    return checkout("https://github.com/forbesmyester/esqlate-server.git", "./dep-esqlate-server", esqlateServerVersion)
}


function checkoutFront(version) {
    return checkout("https://github.com/forbesmyester/esqlate-front.git", "./dep-esqlate-front", esqlateFrontVersion);
}


function npmInstall(dir) {
    let oldDir = process.cwd();
    process.chdir(dir);
    if (!isCorrectStat(getStat("./node_modules"), "d")) {
        myExecNoWait(
            process.platform.match(/^win[0-9]+/) ? "npm.cmd" : "npm",
            ["install"]
        );
    }
    process.chdir(oldDir);
    return Promise.resolve({ status: 0 });
}


function npmBuild(dir, checkFile) {
    let oldDir = process.cwd();
    process.chdir(dir);
    if (!isCorrectStat(getStat(checkFile), "f")) {
        myExecNoWait(
            process.platform.match(/^win[0-9]+/) ? "npm.cmd" : "npm",
            ["run-script", "build"]
        );
    }
    process.chdir(oldDir);
    return Promise.resolve({ status: 0 });
}


function buildServer() {
    checkoutServer();
    createDefinitionDirectory();
    npmInstall("./dep-esqlate-server/");
    return npmBuild("./dep-esqlate-server/", "./dist/cmd.js");
}


function buildFront() {
    checkoutFront();
    npmInstall("./dep-esqlate-front/");
    return npmBuild("./dep-esqlate-front/", "index.html");
}


function server() {

    checkoutServer();
    createDefinitionDirectory();
    npmInstall("./dep-esqlate-server/");
    npmBuild("./dep-esqlate-server/", "./dist/cmd.js");
    process.chdir("./dep-esqlate-server/");

    return myExec(
        "node",
        ["dist/cmd.js", "serve"],
        { env: { ...process.env, DEFINITION_DIRECTORY: "../definition" } }
    );

}


function downloadFront() {
    return Promise.resolve(isCorrectStat(getStat("./dep-esqlate-front.html"), "f"))
        .then((haveHtml) => {
            if (!haveHtml) {
                return download("https://github.com/forbesmyester/esqlate-front/releases/download/" + esqlateFrontVersion + "/index.html")
                    .then((bs) => { writeFileSync("./dep-esqlate-front.html", bs.toString()) })
                    .then(() => ({ status: 0 }));
            }
            return ({ status: 0 });
        });
}


function front() {

    return downloadFront()
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


function sillyGrep() {
    const rl = createInterface({
        input: process.stdin,
        crlfDelay: Infinity
    });

    return new Promise((resolve) => {

        rl.on('line', (line) => {
            if (line.match(/^((REQUEST\: )|(RESPONSE\:))/)) {
                process.stdout.write(line + "\n");
            }
        });

        rl.on('close', () => {
            resolve()
        })

    });

}


function sillySed(pre) {
    const rl = createInterface({
        input: process.stdin,
        crlfDelay: Infinity
    });

    return new Promise((resolve) => {

        rl.on('line', (line) => {
            process.stdout.write(pre + line + "\n");
        });

        rl.on('close', () => {
            resolve()
        })

    });

}


let commands = {
    "server": server,
    "front": front,
    "checkout-front": checkoutFront,
    "checkout-server": checkoutServer,
    "npm-front": npmInstall.bind(null, "dep-esqlate-front"),
    "npm-server": npmInstall.bind(null, "dep-esqlate-server"),
    "download-front": downloadFront,
    "build-front": buildFront,
    "build-server": buildServer,
    "silly-grep": sillyGrep,
    "silly-sed-server": sillySed.bind(null, "Exit: esqlate_server: "),
    "silly-sed-front": sillySed.bind(null, "Exit: esqlate_front: "),
};


let cmd = (process.argv.length ? process.argv.slice(process.argv.length -1)[0] : "");
if (!commands.hasOwnProperty(cmd)) {
    console.error("You must specifiy one of " + JSON.stringify(Object.getOwnPropertyNames(commands)));
    process.exit(1);
}
run(commands[cmd]);
