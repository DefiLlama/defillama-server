import { wrapScheduledLambda } from "./utils/shared/wrap";
import fetch from "node-fetch";

function parse_service_event(event: any, service = 'Service') {
    return [
        {
            'name': service,
            'value': event['Trigger']['Dimensions'][0]['value'],
        },
        {
            'name': 'alarm',
            'value': event['AlarmName'],
        },
        {
            'name': 'description',
            'value': event['AlarmDescription'],
        },
        {
            'name': 'oldestState',
            'value': event['OldStateValue'],
        },
        {
            'name': 'trigger',
            'value': event['Trigger']['MetricName'],
        },
        {
            'name': 'event',
            'value': event['NewStateReason'],
        }
    ].map(s => ({ ...s, inline: true }))
}


const handler = async (event: any) => {
    console.log("event", event)
    const webhookUrl = process.env["CLOUDWATCH_WEBHOOK_URL"]
    let parsed_message = [] as any[]
    for (const record of event.Records) {
        const sns_message = JSON.parse(record['Sns']['Message'])
        const is_alarm = sns_message['Trigger']
        if (is_alarm) {
            if (is_alarm['Namespace'] == 'AWS/Lambda') {
                console.log('Alarm from LAMBDA')
                parsed_message = parse_service_event(sns_message,
                    'Lambda')
            }
        }
        if (!parsed_message) {
            parsed_message = [{
                'name': 'Something not parsed happened',
                'value': JSON.parse(sns_message)
            }]
        }
        const discord_data = {
            'username': 'AWS',
            'avatar_url': 'https://a0.awsstatic.com/libra-css/images/logos/aws_logo_smile_1200x630.png',
            'embeds': [{
                'color': 16711680,
                'fields': parsed_message
            }]
        }

        const response = await fetch(
            `${webhookUrl}?wait=true`,
            {
              method: 'post',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(discord_data)
            }
          ).then(body => body.json())
        console.log("response", response)
    }
}

export default wrapScheduledLambda(handler);