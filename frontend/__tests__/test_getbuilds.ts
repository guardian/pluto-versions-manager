import { CompareVersionResult, compareVersionResults } from "../app/getbuilds";

describe("compareVersionResults", () => {
  it("should return CompareVersionResults.SAME if both versions are the same", () => {
    const deployed: DeployedImageInfo = {
      deploymentName: "test",
      namespace: "test",
      labels: {},
      deployedImages: [
        {
          imageName: "fake/some-test",
          version: "123",
        },
      ],
    };

    const available: BuildInfo = {
      ci_commit_sha: "abcde",
      ci_commit_timestamp: "2021-01-02T03:04:05Z",
      ci_job_url: "https://some.url",
      ci_project_name: "test",
      ci_pipeline_iid: 1234,
      built_image: {
        imageName: "fake/some-test",
        version: "123",
      },
    };

    expect(compareVersionResults(deployed, available)).toEqual(
      CompareVersionResult.SAME
    );
  });

  it("should return CompareVersionResults.NON_NUMERIC if one has a non-numeric ID", () => {
    const deployed: DeployedImageInfo = {
      deploymentName: "test",
      namespace: "test",
      labels: {},
      deployedImages: [
        {
          imageName: "fake/some-test",
          version: "DEV",
        },
      ],
    };

    const available: BuildInfo = {
      ci_commit_sha: "abcde",
      ci_commit_timestamp: "2021-01-02T03:04:05Z",
      ci_job_url: "https://some.url",
      ci_project_name: "test",
      ci_pipeline_iid: 1234,
      built_image: {
        imageName: "fake/some-test",
        version: "123",
      },
    };

    expect(compareVersionResults(deployed, available)).toEqual(
      CompareVersionResult.NON_NUMERIC
    );
  });

  it("should return CompareVersionResults.NEEDS_UPDATE if deployed is behind available", () => {
    const deployed: DeployedImageInfo = {
      deploymentName: "test",
      namespace: "test",
      labels: {},
      deployedImages: [
        {
          imageName: "fake/some-test",
          version: "51",
        },
      ],
    };

    const available: BuildInfo = {
      ci_commit_sha: "abcde",
      ci_commit_timestamp: "2021-01-02T03:04:05Z",
      ci_job_url: "https://some.url",
      ci_project_name: "test",
      ci_pipeline_iid: 1234,
      built_image: {
        imageName: "fake/some-test",
        version: "123",
      },
    };

    expect(compareVersionResults(deployed, available)).toEqual(
      CompareVersionResult.NEEDS_UPDATE
    );
  });

  it("should return CompareVersionResults.DEPLOYMENT_AHEAD if available is behind deployed", () => {
    const deployed: DeployedImageInfo = {
      deploymentName: "test",
      namespace: "test",
      labels: {},
      deployedImages: [
        {
          imageName: "fake/some-test",
          version: "345",
        },
      ],
    };

    const available: BuildInfo = {
      ci_commit_sha: "abcde",
      ci_commit_timestamp: "2021-01-02T03:04:05Z",
      ci_job_url: "https://some.url",
      ci_project_name: "test",
      ci_pipeline_iid: 1234,
      built_image: {
        imageName: "fake/some-test",
        version: "123",
      },
    };

    expect(compareVersionResults(deployed, available)).toEqual(
      CompareVersionResult.DEPLOYMENT_AHEAD
    );
  });

  it("should return CompareVersionResults.NOTHING_AVAILABLE if available has a different name to deployed", () => {
    const deployed: DeployedImageInfo = {
      deploymentName: "test",
      namespace: "test",
      labels: {},
      deployedImages: [
        {
          imageName: "fake/different-test",
          version: "345",
        },
      ],
    };

    const available: BuildInfo = {
      ci_commit_sha: "abcde",
      ci_commit_timestamp: "2021-01-02T03:04:05Z",
      ci_job_url: "https://some.url",
      ci_project_name: "test",
      ci_pipeline_iid: 1234,
      built_image: {
        imageName: "fake/some-test",
        version: "123",
      },
    };

    expect(compareVersionResults(deployed, available)).toEqual(
        CompareVersionResult.NOTHING_AVAILABLE
    );
  });
});
