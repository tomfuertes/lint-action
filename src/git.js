const core = require("@actions/core");

const { run } = require("./utils/action");

/** @typedef {import('./github/context').GithubContext} GithubContext */

/**
 * Fetches and checks out the remote Git branch (if it exists, the fork repository will be used)
 * @param {GithubContext} context - Information about the GitHub
 */
function checkOutRemoteBranch(context) {
	if (context.repository.hasFork) {
		// Fork: Add fork repo as remote
		core.info(`Adding "${context.repository.forkName}" fork as remote with Git`);
		run(
			`git remote add fork https://${context.actor}:${context.token}@github.com/${context.repository.forkName}.git`,
		);
	} else {
		// No fork: Update remote URL to include auth information (so auto-fixes can be pushed)
		core.info(`Adding auth information to Git remote URL`);
		run(
			`git remote set-url origin https://${context.actor}:${context.token}@github.com/${context.repository.repoName}.git`,
		);
	}

	const remote = context.repository.hasFork ? "fork" : "origin";

	// Fetch remote branch
	core.info(`Fetching remote branch "${context.branch}"`);
	run(`git fetch --no-tags --depth=1 ${remote} ${context.branch}`);

	// Switch to remote branch
	core.info(`Switching to the "${context.branch}" branch`);
	run(`git branch --force ${context.branch} --track ${remote}/${context.branch}`);
	run(`git checkout ${context.branch}`);
}

/**
 * Stages and commits all changes using Git
 * @param {string} message - Git commit message
 * @param {boolean} skipVerification - Skip Git verification
 */
function commitChanges(message, skipVerification) {
	core.info(`Committing changes`);
	run(`git commit -am "${message}"${skipVerification ? " --no-verify" : ""}`);
}

/**
 * Returns the SHA of the head commit
 * @returns {string} - Head SHA
 */
function getHeadSha() {
	const sha = run("git rev-parse HEAD").stdout;
	core.info(`SHA of last commit is "${sha}"`);
	return sha;
}

/**
 * Checks whether there are differences from HEAD
 * @returns {boolean} - Boolean indicating whether changes exist
 */
function hasChanges() {
	const output = run("git diff-index --name-status --exit-code HEAD --", { ignoreErrors: true });
	const hasChangedFiles = output.status === 1;
	core.info(`${hasChangedFiles ? "Changes" : "No changes"} found with Git`);
	return hasChangedFiles;
}

/**
 * Pushes all changes to the remote repository
 * @param {boolean} skipVerification - Skip Git verification
 */
function pushChanges(skipVerification) {
	core.info("Pushing changes with Git");
	run(`git push${skipVerification ? " --no-verify" : ""}`);
}

/**
 * Updates the global Git configuration with the provided information
 * @param {string} name - Git username
 * @param {string} email - Git email address
 */
function setUserInfo(name, email) {
	core.info(`Setting Git user information`);
	run(`git config --global user.name "${name}"`);
	run(`git config --global user.email "${email}"`);
}

module.exports = {
	checkOutRemoteBranch,
	commitChanges,
	getHeadSha,
	hasChanges,
	pushChanges,
	setUserInfo,
};
