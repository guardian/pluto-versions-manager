
interface DockerImage {
    imageName: string;
    version: string;
}
/*
case class DeployedImageInfo(
                            deploymentName:String,
                            namespace:String,
                            deployedImages:Seq[DockerImage],
                            observedGeneration:Option[Int],
                            readyReplicas:Option[Int],
                            totalReplicas:Option[Int],
                            notReadyReplicas:Option[Int],
                            labels:Map[String, String]
                            )
 */

interface DeployedImageInfo {
    deploymentName: string;
    namespace: string;
    deployedImages: DockerImage[];
    observedGeneration?:number;
    readyReplicas?:number;
    notReadyReplicas?:number;
    labels:Record<string,string>
}