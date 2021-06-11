package models.gitlab

case class Branch(
                 name:String,
                 merged:Boolean,
                 `protected`: Boolean,
                 default: Boolean,
                 developers_can_push: Option[Boolean],
                 developers_can_merge: Option[Boolean],
                 can_push: Option[Boolean],
                 web_url: Option[String],
                 commit:Commit
                 )
