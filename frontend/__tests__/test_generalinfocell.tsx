import React from "react";
import moxios from "moxios";
import { shallow, mount } from "enzyme";
import GeneralInfoCell from "../app/generalinfocell";
import mock = jest.mock;
import { act, Simulate } from "react-dom/test-utils";
import error = Simulate.error;

describe("GeneralInfoCell", () => {
  beforeEach(() => moxios.install());
  afterEach(() => moxios.uninstall());

  it("should load in and display master build info on mount", (done) => {
    const fakeDeployment: DeployedImageInfo = {
      deploymentName: "test",
      namespace: "test namespace",
      deployedImages: [
        {
          imageName: "fred",
          version: "1",
        },
      ],
      labels: {
        "gitlab-project-id": "12345",
        "gitlab-publishing-job": "upload",
      },
    };

    const rendered = mount(
      <GeneralInfoCell deploymentInfo={fakeDeployment} hideOn404={false} />
    );

    moxios.wait(async () => {
      try {
        const req = moxios.requests.mostRecent();

        expect(req.url).toEqual("/api/project/12345/main/upload/buildinfo");
        const mockBuildInfo: BuildInfo = {
          ci_commit_sha: "abcdefg",
          ci_commit_timestamp: "2021-01-02T03:04:05Z",
          ci_job_url: "https://some-url",
          ci_project_name: "little jim",
          ci_pipeline_iid: 1234,
          built_image: {
            imageName: "fred",
            version: "3",
          },
        };
        await act(async () => {
          await req.respondWith({
            status: 200,
            response: mockBuildInfo,
          });
          rendered.update();
        });

        expect(rendered.find("p#docker-image-name").text()).toEqual("fred");
        expect(rendered.find("p#docker-image-version").text()).toEqual("3");
        expect(rendered.find("p#build-date").text()).toEqual(
          "built at 2021-01-02T03:04:05Z"
        );
        done();
      } catch (err) {
        done.fail(err);
      }
    });
  });

  it("should display a 404 error if hideOn404 is false", (done) => {
    const fakeDeployment: DeployedImageInfo = {
      deploymentName: "test",
      namespace: "test namespace",
      deployedImages: [
        {
          imageName: "fred",
          version: "1",
        },
      ],
      labels: {
        "gitlab-project-id": "12345",
        "gitlab-publishing-job": "upload",
      },
    };

    const rendered = mount(
      <GeneralInfoCell deploymentInfo={fakeDeployment} hideOn404={false} />
    );

    moxios.wait(async () => {
      try {
        const req = moxios.requests.mostRecent();

        expect(req.url).toEqual("/api/project/12345/main/upload/buildinfo");

        await act(async () => {
          await req.respondWith({
            status: 404,
            response: {
              detail: "not found",
            },
          });
          rendered.update();
        });

        moxios.wait(async () => {
          const nextReq = moxios.requests.mostRecent();
          expect(nextReq.url).toEqual(
            "/api/project/12345/master/upload/buildinfo"
          );

          await act(async () => {
            await nextReq.respondWith({
              status: 404,
              response: {
                detail: "not found",
              },
            });
            rendered.update();
          });

          rendered.find("p").map((elem) => console.log(elem.html()));

          const errorNode = rendered.find("p#error-message");
          expect(errorNode.exists()).toBeTruthy();
          expect(errorNode.text()).toEqual(
            "Could not determine available versions: Server returned 404"
          );
          done();
        });
      } catch (err) {
        done.fail(err);
      }
    });
  });

  it("should not display a 404 error if hideOn404 is true", (done) => {
    const fakeDeployment: DeployedImageInfo = {
      deploymentName: "test",
      namespace: "test namespace",
      deployedImages: [
        {
          imageName: "fred",
          version: "1",
        },
      ],
      labels: {
        "gitlab-project-id": "12345",
        "gitlab-publishing-job": "upload",
      },
    };

    const rendered = mount(
      <GeneralInfoCell deploymentInfo={fakeDeployment} hideOn404={true} />
    );

    moxios.wait(async () => {
      try {
        const req = moxios.requests.mostRecent();
        expect(req.url).toEqual("/api/project/12345/main/upload/buildinfo");

        await act(async () => {
          await req.respondWith({
            status: 404,
            response: {
              detail: "not found",
            },
          });
          rendered.update();
        });

        rendered.find("p").map((elem) => console.log(elem.html()));

        const errorNode = rendered.find("p#error-message");
        expect(errorNode.exists()).toBeFalsy();
        done();
      } catch (err) {
        done.fail(err);
      }
    });
  });
});
