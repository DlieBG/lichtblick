import { Time } from "@lichtblick/rostime";

export function ns_to_time(ns: number): Time {
    const sec = Math.floor(ns / 1e9);
    const nsec = ns % 1e9;
    return { sec, nsec };
}

export function time_to_ns(time: Time): number {
    return time.sec * 1e9 + time.nsec;
}
