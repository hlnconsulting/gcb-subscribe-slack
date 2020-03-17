const { IncomingWebhook } = require('@slack/webhook');
const url = process.env.SLACK_WEBHOOK_URL;

const webhook = new IncomingWebhook(url);

// subscribeSlack is the main function called by Cloud Functions.
module.exports.gcbSubscribeSlack = (pubSubEvent, context) => {
    const build = eventToBuild(pubSubEvent.data);

    // Skip if the current status is not in the status list.
    // Add additional statuses to list if you'd like:
    // QUEUED, WORKING, SUCCESS, FAILURE,
    // INTERNAL_ERROR, TIMEOUT, CANCELLED
    const status = ['SUCCESS', 'FAILURE', 'INTERNAL_ERROR', 'TIMEOUT', 'CANCELLED'];
    if (status.indexOf(build.status) === -1) {
        return;
    }
    if (
        (typeof build.substitutions === 'undefined'
            || typeof build.substitutions.REPO_NAME === 'undefined')
        && (typeof build.sourceProvenance === 'undefined'
            || typeof build.sourceProvenance.resolvedRepoSource === 'undefined'
            || typeof build.sourceProvenance.resolvedRepoSource.repoName === 'undefined')
        &&
        (typeof build.source === 'undefined'
            || typeof build.source.repoSource == 'undefined')
    ) {
        console.warn(`build object didn't pass validation: ${JSON.stringify(build)}`);
        return;
    }

    // Send message to Slack.
    const message = createSlackMessage(build);
    webhook.send(message);
};

// eventToBuild transforms pubsub event message to a build object.
const eventToBuild = (data) => {
    return JSON.parse(Buffer.from(data, 'base64').toString());
}

// createSlackMessage creates a message from a build object.
const createSlackMessage = (build) => {

    console.debug(`build object: ${JSON.stringify(build)}`);

    let text;
    if (typeof build.substitutions !== 'undefined'
        && typeof build.substitutions.REPO_NAME !== 'undefined') {
        // this is the Cloud Build GitHub App build format
        text = `Build for \`github/${build.substitutions.REPO_NAME}\` \
branch \`${build.substitutions.BRANCH_NAME}\` \
commit \`${build.substitutions.COMMIT_SHA}\` \
completed.\n\
Started: \`${build.startTime}\`\n\
Finished: \`${build.finishTime}\``;
    } else {
        // this is the traditional sync repo build format
        text = `Build for \`${build.sourceProvenance.resolvedRepoSource.repoName.replace(/_/g, '/')}\` \
branch \`${build.source.repoSource.branchName}\` \
commit \`${build.sourceProvenance.resolvedRepoSource.commitSha}\` \
completed.\n\
Started: \`${build.startTime}\`\n\
Finished: \`${build.finishTime}\``;
    }

    const message = {
        text: text,
        mrkdwn: true,
        attachments: [
            {
                title: 'Build logs',
                title_link: build.logUrl,
                fields: [{
                    title: 'Status',
                    value: build.status
                }]
            }
        ]
    };
    return message;
}
