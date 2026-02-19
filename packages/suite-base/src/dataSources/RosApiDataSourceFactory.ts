// SPDX-FileCopyrightText: Copyright (C) 2023-2026 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import {
  IDataSourceFactory,
  DataSourceFactoryInitializeArgs,
} from "@lichtblick/suite-base/context/PlayerSelectionContext";
import { IterablePlayer } from "@lichtblick/suite-base/players/IterablePlayer";
import { WorkerSerializedIterableSource } from "@lichtblick/suite-base/players/IterablePlayer/WorkerSerializedIterableSource";
import { Player } from "@lichtblick/suite-base/players/types";
import { getUser } from "@lichtblick/suite-base/util/auth";

class RosApiDataSourceFactory implements IDataSourceFactory {
  public id = "ros-api";
  public type: IDataSourceFactory["type"] = "connection";
  public displayName = "Audi ROS API";
  public iconName: IDataSourceFactory["iconName"] = "AUDI";
  public warning = "[BETA] Expect bugs and missing features. Please report any issues you encounter.";
  public description = "Connect to the ROS API.";
  public docsLinks = [
    {
      label: "ROS API",
      url: "https://hugin.dev-engfactoryad.audi.de/docs",
    },
  ];

  public formConfig = {
    fields: [
      {
        id: "rosApiUrl",
        label: "ROS API URL",
        defaultValue: "https://hugin.dev-engfactoryad.audi.de",
        // defaultValue: "http://localhost:8000",
        validate: (newValue: string): Error | undefined => {
          try {
            const url = new URL(newValue);
            if (url.protocol !== "http:" && url.protocol !== "https:") {
              return new Error(`Invalid protocol: ${url.protocol}`);
            }
            return undefined;
          } catch (err: unknown) {
            console.error(err);
            return new Error("Enter a valid url");
          }
        },
      },
      {
        id: "measurementId",
        label: "Measurement ID",
        defaultValue: "e6934d93-17d1-4c3b-954b-bf6e1f41a8e3",
        validate: (newValue: string): Error | undefined => {
          return newValue ? undefined : new Error("Measurement ID cannot be empty");
        },
      },
      {
        id: "startTimeNs",
        label: "Start Time (ns)",
        defaultValue: "0",
        validate: (newValue: string): Error | undefined => {
          const num = Number(newValue);
          if (isNaN(num)) {
            return new Error("Start time must be a number");
          }
          return undefined;
        },
      },
      {
        id: "endTimeNs",
        label: "End Time (ns)",
        defaultValue: "1000",
        validate: (newValue: string): Error | undefined => {
          const num = Number(newValue);
          if (isNaN(num)) {
            return new Error("End time must be a number");
          }
          return undefined;
        },
      },
    ],
  };

  public initialize(args: DataSourceFactoryInitializeArgs): Player | undefined {
    const rosApiUrl = args.params?.["rosApiUrl"];
    const measurementId = args.params?.["measurementId"];
    const startTimeNs = args.params?.["startTimeNs"] || "0";
    const endTimeNs = args.params?.["endTimeNs"] || "0";

    if (!rosApiUrl || !measurementId) {
      return;
    }

    const params = { rosApiUrl, measurementId, startTimeNs, endTimeNs };

    const user = getUser();

    if (!user) {
      return;
    }

    const initWorker = () => {
      return new Worker(
        // foxglove-depcheck-used: babel-plugin-transform-import-meta
        new URL(
          "@lichtblick/suite-base/players/IterablePlayer/RosApi/RosApiIterableSourceWorker.worker",
          import.meta.url,
        ),
      );
    };

    const source = new WorkerSerializedIterableSource({
      initWorker,
      initArgs: {
        params: {
          ...params,
          accessToken: user.access_token,
        },
      },
    });

    return new IterablePlayer({
      source,
      name: `ROS API - ${measurementId}`,
      metricsCollector: args.metricsCollector,
      urlParams: params,
      sourceId: this.id,
      readAheadDuration: { sec: 10, nsec: 0 },
    });
  }
}

export default RosApiDataSourceFactory;
