import auth.BearerTokenAuth
import com.nimbusds.jose.jwk.JWKSet
import org.specs2.mock.Mockito
import org.specs2.mutable.Specification
import play.api.Configuration

class BearerTokenAuthSpec extends Specification with Mockito {
  "BearerTokenAuth" should {
    "load keys from a remote endpoint if that is what the configuration says" in {
      val fakeConfig = Configuration.from(Map("auth.tokenSigningCertPath"->"https://some-idp"))
      val mockLoadFromRemote = mock[(String)=>JWKSet]
      mockLoadFromRemote.apply(any) returns mock[JWKSet]
      val mockLoadFromLocal = mock[String=>JWKSet]
      mockLoadFromLocal.apply(any) returns mock[JWKSet]

      val toTest = new BearerTokenAuth(fakeConfig) {
        override protected def loadRemoteJWKSet(remotePath: String): JWKSet = mockLoadFromRemote(remotePath)

        override protected def loadLocalJWKSet(pemCertLocation: String): JWKSet = mockLoadFromLocal(pemCertLocation)
      }

      there was no(mockLoadFromLocal).apply(any)
      there was one(mockLoadFromRemote).apply("https://some-idp")
    }

    "load keys from a local file if that is what the configuration says" in {
      val fakeConfig = Configuration.from(Map("auth.tokenSigningCertPath"->"/path/to/some.file"))
      val mockLoadFromRemote = mock[(String)=>JWKSet]
      mockLoadFromRemote.apply(any) returns mock[JWKSet]
      val mockLoadFromLocal = mock[String=>JWKSet]
      mockLoadFromLocal.apply(any) returns mock[JWKSet]

      val toTest = new BearerTokenAuth(fakeConfig) {
        override protected def loadRemoteJWKSet(remotePath: String): JWKSet = mockLoadFromRemote(remotePath)

        override protected def loadLocalJWKSet(pemCertLocation: String): JWKSet = mockLoadFromLocal(pemCertLocation)
      }

      there was one(mockLoadFromLocal).apply("/path/to/some.file")
      there was no(mockLoadFromRemote).apply(any)
    }
  }
}
