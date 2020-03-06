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
    const message = {
        //         text: `Build for \`${build.sourceProvenance.resolvedRepoSource.repoName.replace(/_/g, '/')}\` \
        // branch \`${build.source.repoSource.branchName}\` \
        // commit \`${build.sourceProvenance.resolvedRepoSource.commitSha}\` \
        // completed.\n\
        // Started: \`${build.startTime}\`\n\
        // Finished: \`${build.finishTime}\``,
        text: `Build for \`${build}\``,
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
