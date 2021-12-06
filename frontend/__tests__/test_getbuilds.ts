import {
  CompareVersionResult,
  compareVersionResults,
  getLatestMainlineBuild,
} from "../app/getbuilds";
import moxios from "moxios";

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

describe("getLatestMainlineBuild", () => {
  beforeEach(() => moxios.install());
  afterEach(() => moxios.uninstall());

  it("should extract the project id and job name from the DeployedImageInfo and request results from the server", (done) => {
    const deployed: DeployedImageInfo = {
      deploymentName: "test",
      namespace: "test",
      labels: {
        "gitlab-project-id": "12345678",
        "gitlab-publishing-job": "docker",
      },
      deployedImages: [
        {
          imageName: "fake/some-test",
          version: "345",
        },
      ],
    };

    const resultProm = getLatestMainlineBuild(deployed);

    moxios.wait(async () => {
      const req = moxios.requests.mostRecent();

      try {
        expect(req.url).toEqual("/api/project/12345678/main/docker/buildinfo");
      } catch (e) {
        done.fail(e);
      }

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

      await req.respondWith({
        status: 200,
        response: available,
      });

      const result = await resultProm;
      try {
        expect(result).toEqual(available);
        done();
      } catch (e) {
        done.fail(e);
      }
    });
  });

  it("should fallback to using 'master' branch instead of 'main' if the latter is not present", (done) => {
    const deployed: DeployedImageInfo = {
      deploymentName: "test",
      namespace: "test",
      labels: {
        "gitlab-project-id": "12345678",
        "gitlab-publishing-job": "docker",
      },
      deployedImages: [
        {
          imageName: "fake/some-test",
          version: "345",
        },
      ],
    };

    const resultProm = getLatestMainlineBuild(deployed);

    moxios.wait(async () => {
      const req = moxios.requests.mostRecent();

      try {
        expect(req.url).toEqual("/api/project/12345678/main/docker/buildinfo");
      } catch (e) {
        done.fail(e);
      }

      await req.respondWith({
        status: 404,
        response: { status: "notpresent" },
      });

      moxios.wait(async () => {
        const req = moxios.requests.mostRecent();

        try {
          expect(req.url).toEqual(
            "/api/project/12345678/master/docker/buildinfo"
          );
        } catch (e) {
          done.fail(e);
        }
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

        await req.respondWith({
          status: 200,
          response: available,
        });

        const result = await resultProm;
        try {
          expect(result).toEqual(available);
          done();
        } catch (e) {
          done.fail(e);
        }
      });
    });
  });

  it("should fail if the server returns a non-200 response", (done) => {
    const deployed: DeployedImageInfo = {
      deploymentName: "test",
      namespace: "test",
      labels: {
        "gitlab-project-id": "12345678",
        "gitlab-publishing-job": "docker",
      },
      deployedImages: [
        {
          imageName: "fake/some-test",
          version: "345",
        },
      ],
    };

    const resultProm = getLatestMainlineBuild(deployed);

    const testIt = async () => {
      try {
        moxios.wait(async () => {
          const req = moxios.requests.mostRecent();

          try {
            expect(req.url).toEqual(
              "/api/project/12345678/main/docker/buildinfo"
            );
          } catch (e) {
            done.fail(e);
          }

          const response = {
            status: "error",
            detail: "Aieeeeeeee",
          };

          await req.respondWith({
            status: 500,
            response: response,
          });
        });
        await resultProm;
        done.fail("Expected an exception but didn't get one");
      } catch (e) {
        expect(e).toEqual("Server returned 500");
        done();
      }
    };
    return testIt();
  });
});
