import { Time } from "@lichtblick/rostime";
import { Immutable, MessageEvent } from "@lichtblick/suite";
import {
    GetBackfillMessagesArgs,
    Initialization,
    ISerializedIterableSource,
    IteratorResult,
    MessageIteratorArgs,
} from "../IIterableSource";
import {
    ns_to_time,
    time_to_ns,
} from "./RosApiUtils";
import { PlayerAlert } from "@lichtblick/suite-base/players/types";

export class RosApiIterableSource implements ISerializedIterableSource {
    #textEncoder = new TextEncoder();
    #rosApiUrl: string;
    #measurementId: string;
    #startTimeNs: number;
    #endTimeNs: number;
    #accessToken: string;

    #structuredDataInfo: any = {};

    public readonly sourceType = "serialized";

    public constructor(
        {
            rosApiUrl,
            measurementId,
            startTimeNs,
            endTimeNs,
            accessToken,
        }: {
            rosApiUrl: string;
            measurementId: string;
            startTimeNs: string;
            endTimeNs: string;
            accessToken: string;
        }
    ) {
        this.#rosApiUrl = rosApiUrl;
        this.#measurementId = measurementId;
        this.#startTimeNs = parseInt(startTimeNs);
        this.#endTimeNs = parseInt(endTimeNs);
        this.#accessToken = accessToken;
    }

    public async initialize(): Promise<Initialization> {
        const alerts: PlayerAlert[] = [];

        const structured_data_list_response = await (await fetch(`${this.#rosApiUrl}/api/v1/structured_data/`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${this.#accessToken}`,
            },
            body: JSON.stringify({
                path: `${this.#measurementId}/raw`,
            }),
        })).json();

        alerts.push({
            severity: "info",
            message: this.#accessToken ? "User authenticated" : "No access token",
        });

        for (const entry of structured_data_list_response) {
            this.#structuredDataInfo[entry.type] = entry;
        }

        this.#startTimeNs = 1764931361789805700;
        this.#endTimeNs = 1764931361789805700 + 1_000_000_000 * 120;

        return {
            start: ns_to_time(this.#startTimeNs),
            end: ns_to_time(this.#endTimeNs),
            topics: structured_data_list_response.map(
                (entry: any) => ({
                    name: entry.type,
                    schemaName: entry.message_identifier,
                    messageEncoding: "json",
                    schemaEncoding: "jsonschema",
                })
            ),
            topicStats: new Map(
                structured_data_list_response.map(
                    (entry: any) => [
                        entry.type,
                        {
                            numMessages: entry.rosbag_time_range.message_count,
                            firstMessageTime: ns_to_time(entry.rosbag_time_range.start_time_ns),
                            lastMessageTime: ns_to_time(entry.rosbag_time_range.end_time_ns),
                        }
                    ]
                )
            ),
            datatypes: new Map(
                structured_data_list_response.map(
                    (entry: any) => [
                        entry.message_identifier,
                        {
                            name: entry.message_identifier,
                            definitions: [],
                        }
                    ]
                )
            ),
            profile: undefined,
            publishersByTopic: new Map([
                // [
                //     "tapi_debug_protocol",
                //     new Set(["1"]),
                // ]
            ]),
            alerts,
        };
    }

    public async *messageIterator(
        args: Immutable<MessageIteratorArgs>,
    ): AsyncIterableIterator<Readonly<IteratorResult<Uint8Array>>> {
        console.log("args", args)
        const start_time_ns = time_to_ns(args.start || ns_to_time(this.#startTimeNs));
        const end_time_ns = time_to_ns(args.end || ns_to_time(this.#endTimeNs));

        for (const topic of args.topics.values()) {
            if (!this.#structuredDataInfo[topic.topic])
                continue;

            const structured_segment_response = await (await fetch(`${this.#rosApiUrl}/api/v1/structured_data/segment.json`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    path: this.#structuredDataInfo[topic.topic].path,
                    start_time_ns: start_time_ns,
                    end_time_ns: end_time_ns,
                    message_identifier: this.#structuredDataInfo[topic.topic].message_identifier,
                    messages_per_s: 3,
                }),
            })).json();

            for (const rosMessage of structured_segment_response) {
                const message = this.#textEncoder.encode(
                    JSON.stringify(rosMessage[0])
                );

                yield {
                    type: "message-event",
                    msgEvent: {
                        topic: topic.topic,
                        receiveTime: ns_to_time(rosMessage[1]),
                        message,
                        sizeInBytes: message.byteLength,
                        schemaName: this.#structuredDataInfo[topic.topic].message_identifier,
                    },
                };
            }
        }

        // const message = this.#textEncoder.encode(
        //     JSON.stringify({
        //         ...EXAMPLE_MESSAGE_OBJECT,
        //         measurementId: this.#measurementId,
        //         rosApiUrl: this.#rosApiUrl,
        //         value: 123
        //     }),
        // );

        // yield {
        //     type: "message-event",
        //     msgEvent: {
        //         topic: EXAMPLE_TOPIC,
        //         receiveTime: EXAMPLE_MESSAGE_TIME,
        //         message,
        //         sizeInBytes: message.byteLength,
        //         schemaName: EXAMPLE_SCHEMA,
        //     },
        // };
    }

    public async getBackfillMessages(
        args: Immutable<GetBackfillMessagesArgs>,
    ): Promise<MessageEvent<Uint8Array>[]> {
        console.log("getBackfillMessages args", args);
        return [];
        if (!args.topics.has(EXAMPLE_TOPIC)) {
            return [];
        }

        if (compareTime(args.time, EXAMPLE_MESSAGE_TIME) < 0) {
            return [];
    }

        const message = this.#textEncoder.encode(
            JSON.stringify({
                ...EXAMPLE_MESSAGE_OBJECT,
                measurementId: this.#measurementId,
                rosApiUrl: this.#rosApiUrl,
            }),
        );

        return [
            {
                topic: EXAMPLE_TOPIC,
                receiveTime: EXAMPLE_MESSAGE_TIME,
                message,
                sizeInBytes: message.byteLength,
                schemaName: EXAMPLE_SCHEMA,
            },
        ];
    }
}

function compareTime(a: Time, b: Time): number {
    if (a.sec !== b.sec) {
        return a.sec - b.sec;
    }
    return a.nsec - b.nsec;
}
