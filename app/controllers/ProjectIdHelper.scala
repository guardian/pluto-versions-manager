package controllers

import scala.util.Try

object ProjectIdHelper {
  /**
   * If the given str can be converted to a number, then do so. Otherwise returns None
   * @param str string that may be numeric
   * @return either Some() with the number or None
   */
  def numericId(str:String) = Try { str.toLong }.toOption
}
